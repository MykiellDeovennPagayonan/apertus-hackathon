.DEFAULT_GOAL := run

.PHONY: run stop dev stop-dev install provision run-web run-realistic run-apertus run-laya stop-web stop-apertus stop-laya build start benchmark benchmark-model eval
run stop dev stop-dev install provision run-web run-realistic run-apertus run-laya stop-web stop-apertus stop-laya build start benchmark benchmark-model eval:
	$(MAKE) -C track_2b $@
