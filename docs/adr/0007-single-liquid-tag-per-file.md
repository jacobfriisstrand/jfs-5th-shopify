# ADR-0007 — One `{% liquid %}` tag per file, hoisted to the top

## Status

Accepted.

## Context

Liquid files (`sections/`, `blocks/`, `snippets/`, `layout/`) freely mix
markup with control flow. Two patterns appear in the wild:

1. **Scattered tags** — multiple small `{% liquid %}` blocks (or many
   inline `{% assign %}` / `{% if %}` tags) interleaved with markup, each
   computing values just before the markup that consumes them.
2. **Hoisted prologue** — a single `{% liquid %}` block at the very top of
   the file that assigns every variable the markup will reference, followed
   by markup that reads those variables.

Pattern 1 spreads the "what is this file computing?" answer across the
whole file. Reviewers and agents must scan the entire body to learn which
inputs drive the output, and conditional branches often duplicate
assignments (e.g. computing `count` inside both the `if` and `else`
branch). It also encourages dead identifiers — a `{% assign x = ... %}`
buried mid-file can outlive the markup that read it, with no visible
signal.

Pattern 2 makes every file's "data section" obvious: the prologue is the
complete contract between the file's inputs (settings, block/section
context, render params) and its markup.

## Decision

**Every Liquid file has at most one `{% liquid %}` block, placed at the
very top of the file (above any markup).** All variable assignments,
defaults, and pre-render computation live inside that single block.

Rules:

1. **One `{% liquid %}` block per file.** Never sprinkle multiple
   `{% liquid %}` tags through the file. Never use bare `{% assign %}`,
   `{% capture %}`, or branching `{% if %}/{% case %}` blocks that only
   exist to compute a value — fold them into the prologue.
2. **The block sits at the top of the file**, after the `{% doc %}` header
   (snippets/blocks) and before any markup or `{% schema %}` tag.
3. **All values the markup will reference are assigned in the prologue.**
   Markup branches (`{% if foo != blank %}`, `{% case bar %}`) are still
   fine — they read variables, they don't compute them.
4. **Tiny output expressions stay inline.** A single `{{ product.title }}`
   inside markup is not "computation" and does not need to be assigned in
   the prologue.
5. **Conditional assignments use `if`/`case` inside the `{% liquid %}`
   block**, not outside it. Example:
   ```liquid
   {% liquid
     assign count = collection.products_count
     if count > products_to_show
       assign count = products_to_show
     endif
   %}
   ```
6. **`{% render %}` and `{% content_for %}` tags stay in the markup**, not
   in the prologue. They produce output, not values.

## Consequences

**Positive:**

- Every Liquid file has a single, obvious "this is what this file
  computes" section. Reviewers and agents can read the prologue and know
  every identifier the markup references.
- Eliminates the silent-dead-code class of bug where an `{% assign %}`
  buried mid-file is shadowed by an earlier identifier or never read.
- Pairs cleanly with the AGENTS.md "Settings ↔ markup parity" rule: the
  prologue is where every schema setting becomes a named variable, making
  the schema-to-markup mapping greppable.
- Makes diffs smaller — moving a piece of markup doesn't drag a hidden
  `{% assign %}` along with it.

**Negative:**

- Files with large prologues can feel heavy. Mitigate by extracting truly
  reusable logic into snippets (which then have their own prologue).
- Pattern requires discipline; new contributors must be told the rule
  exists. AGENTS.md links here.

## Example (before → after)

**Before** (scattered):

```liquid
{% assign heading = section.settings.heading %}

<section>
  {% if heading != blank %}
    <h2>{{ heading }}</h2>
  {% endif %}

  {%- if collection != blank -%}
    {%- liquid
      assign count = collection.products_count
      if count > products_to_show
        assign count = products_to_show
      endif
    -%}
    {% render 'carousel', count: count %}
  {%- endif -%}
</section>
```

**After** (hoisted):

```liquid
{% liquid
  assign heading = section.settings.heading
  assign collection = section.settings.collection
  assign products_to_show = section.settings.products_to_show | default: 4
  assign count = collection.products_count
  if count > products_to_show
    assign count = products_to_show
  endif
%}

<section>
  {% if heading != blank %}
    <h2>{{ heading }}</h2>
  {% endif %}

  {% render 'carousel', count: count %}
</section>
```
