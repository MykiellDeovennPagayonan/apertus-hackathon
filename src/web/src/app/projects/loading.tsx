import LoadingState from "../_components/LoadingState";
export default function Loading() {
  return (
    <LoadingState
      title="Opening your projects…"
      description="Fetching your saved experiments and compositions."
    />
  );
}
