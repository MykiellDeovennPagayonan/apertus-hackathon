.DEFAULT_GOAL := run

.PHONY: run run-external stop dev stop-dev install provision run-web run-realistic run-apertus run-laya stop-web stop-apertus stop-laya build start benchmark benchmark-model eval
run run-external stop dev stop-dev install provision run-web run-realistic run-apertus run-laya stop-web stop-apertus stop-laya build start benchmark benchmark-model eval:
	$(MAKE) -C track_2b $@
