export type Feedback = {
  severity: "error" | "success" | "info";
  code: string;
  action: string;
  title: string;
  body: string;
  details?: string;
};
export function makeFeedback(
  detail: string,
  severity: Feedback["severity"],
  action: string,
  code: string,
): Feedback {
  const technical =
    /[0-9a-f]{8}-[0-9a-f-]{27,}|invalid editor position|undeclared|unknown definition|recipe:|document:/i.test(
      detail,
    );
  return {
    severity,
    action,
    code,
    title:
      severity === "error"
        ? `Couldn't ${action.charAt(0).toLowerCase()}${action.slice(1)}`
        : severity === "success"
          ? "Saved to library"
          : action,
    body: technical
      ? "These settings could not be validated. Review the component settings and try again. Technical details are available below."
      : detail,
    details:
      severity === "error"
        ? `${code}\nAction: ${action}\n${detail}`
        : undefined,
  };
}
