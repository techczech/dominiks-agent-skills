# Illustrated sample

Copy `kit/samples/frames/` to `assets/frames/` and `kit/samples/sample-widget.html` to `assets/` in the project first (the gallery does this itself).

## Search and agents

### Search by a person {illustration frame=assets/frames/search-person.json id=search}
> You type what you remember into the search box. The results come back as a list of files.

### The agent uses tools {illustration frame=assets/frames/agent-tools.json id=agent}
> The agent searches the files first. Then it opens the two that match and reads what it finds. What it reads lands in its context.

### Products {illustration frame=assets/frames/logo-row.json id=products}
> OpenAI, Claude and Gemini each make an assistant you can talk to.

## A widget

### A widget builds in steps {widget src=assets/sample-widget.html steps=2 id=w}
- second bar
- third bar
> The first bar stands alone. Then a second bar joins it, and a third bar rises above both.
