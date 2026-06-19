.PHONY: validate zip

validate:
	python scripts/validate_structure.py

zip:
	cd .. && zip -r agentic-prompt-intake.zip agentic-prompt-intake -x "*/.git/*"
