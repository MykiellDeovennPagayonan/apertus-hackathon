"""MLX server entry point with the verified Apertus tokenizer compatibility fix.

The pinned mlx-lm CLI does not expose tokenizer load kwargs. Keep the adapter
here rather than patching site-packages or the downloaded model cache.
"""
from mlx_lm import server


class ApertusModelProvider(server.ModelProvider):
    def __init__(self, args):
        super().__init__(args)
        self._tokenizer_config["fix_mistral_regex"] = True


def main():
    server.ModelProvider = ApertusModelProvider
    server.main()


if __name__ == "__main__":
    main()
