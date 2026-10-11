import {
  applyAuthoringOperation,
  type OperationState,
  type ToolRequest,
} from "./operations";
import { type AuthoredDocument, emptyAuthoredDocument } from "./types";
import { assertData } from "./validate";

export type ToolEnvelope = {
  draftId: string;
  expectedRevision: number;
  operationId: string;
  request: ToolRequest | ToolRequest[];
};
export type OperationReceipt = {
  operationId: string;
  draftRevision: number;
  status: "applied" | "rejected";
  handles: Record<string, string>;
  summary: string;
  issues: { code: string; path?: string; message: string }[];
};
/** All aliases, geometry and topology stay in application memory, outside inference context. */
export class AuthoringTransaction {
  private state: OperationState;
  private receipts = new Map<
    string,
    { payload: string; receipt: OperationReceipt }
  >();
  revision = 0;
  private operationCount = 0;
  readonly draftId: string;
  constructor(
    draftIdOrDoc: string | AuthoredDocument = "draft",
    document?: AuthoredDocument,
    private readonly limits = { operations: 12, receipts: 24 },
  ) {
    if (
      !Number.isInteger(limits.operations) ||
      limits.operations < 1 ||
      limits.operations > 48 ||
      !Number.isInteger(limits.receipts) ||
      limits.receipts < 1 ||
      limits.receipts > 64
    )
      throw new Error("Invalid bounded authoring limits");
    let doc: AuthoredDocument;
    if (typeof draftIdOrDoc === "string") {
      this.draftId = draftIdOrDoc;
      doc = document ?? emptyAuthoredDocument();
    } else {
      this.draftId = "draft";
      doc = draftIdOrDoc ?? emptyAuthoredDocument();
    }
    const handles: Record<string, string> = {};
    if (doc.nodes) {
      for (const node of doc.nodes) {
        handles[node.id] = node.id;
      }
    }
    this.state = { document: structuredClone(doc), handles };
  }
  fork() {
    const copy = new AuthoringTransaction(this.draftId, undefined, this.limits);
    copy.state = structuredClone(this.state);
    copy.revision = this.revision;
    copy.operationCount = this.operationCount;
    copy.receipts = new Map(structuredClone([...this.receipts]));
    return copy;
  }
  get document() {
    return structuredClone(this.state.document);
  }
  get handles() {
    return { ...this.state.handles };
  }
  execute(envelope: ToolEnvelope): OperationReceipt {
    const reject = (code: string, message: string): OperationReceipt => ({
      operationId: envelope.operationId,
      draftRevision: this.revision,
      status: "rejected",
      handles: this.handles,
      summary: "No changes applied.",
      issues: [{ code, message }],
    });
    assertData(envelope);
    if (
      Object.keys(envelope).some(
        (key) =>
          !["draftId", "expectedRevision", "operationId", "request"].includes(
            key,
          ),
      ) ||
      !Number.isSafeInteger(envelope.expectedRevision) ||
      envelope.expectedRevision < 0
    )
      return reject("envelope", "Invalid operation envelope");
    if (envelope.draftId !== this.draftId)
      return reject("draft", "Wrong draft identity");
    const canonical = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(canonical)
        : value && typeof value === "object"
          ? Object.fromEntries(
              Object.entries(value)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, item]) => [key, canonical(item)]),
            )
          : value;
    const payload = JSON.stringify(canonical(envelope.request));
    const prior = this.receipts.get(envelope.operationId);
    if (prior)
      return structuredClone(
        prior.payload === payload
          ? prior.receipt
          : reject(
              "duplicate",
              "Operation identity was reused with a different payload",
            ),
      );
    if (
      !/^[a-zA-Z0-9][a-zA-Z0-9/_:.-]{0,99}$/.test(envelope.operationId) ||
      this.receipts.size >= this.limits.receipts
    )
      return reject(
        "identity",
        "Invalid operation identity or receipt limit exceeded",
      );
    if (envelope.expectedRevision !== this.revision)
      return reject("revision", "Draft has changed");
    const requests = Array.isArray(envelope.request)
      ? envelope.request
      : [envelope.request];
    if (
      !requests.length ||
      requests.length > 12 ||
      this.operationCount + requests.length > this.limits.operations
    )
      return reject(
        "budget",
        `At most ${this.limits.operations} authoring operations are allowed`,
      );
    let receipt: OperationReceipt;
    try {
      let staged = structuredClone(this.state);
      let serial = 0;
      const allocate = (id: string) =>
        `op${this.revision + 1}-${++serial}/${id}`;
      for (const request of requests)
        staged = applyAuthoringOperation(staged, request, allocate);
      this.state = staged;
      this.operationCount += requests.length;
      this.revision++;
      receipt = {
        operationId: envelope.operationId,
        draftRevision: this.revision,
        status: "applied",
        handles: this.handles,
        summary: `Applied ${requests.length} authoring operation(s).`,
        issues: [],
      };
    } catch (error) {
      receipt = reject(
        "validation",
        error instanceof Error ? error.message : "Invalid operation",
      );
    }
    this.receipts.set(envelope.operationId, {
      payload,
      receipt: structuredClone(receipt),
    });
    return receipt;
  }
}
