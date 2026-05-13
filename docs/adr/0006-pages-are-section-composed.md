# ADR-0006 — Pages are section-composed; Shopify's native rich-text `page.content` is never auto-rendered

## Status

Accepted.

## Context

Shopify's default page model gives merchants a WYSIWYG rich-text editor for `page.content` (the body of any page created in Shopify Admin → Online Store → Pages). The default `templates/page.json` in Shopify-generated themes typically renders `{{ page.content }}` inside a section, exposing that rich-text body verbatim on the storefront.

This pattern has known problems for the kind of content surfaces this theme is built for:

- **No structural authoring.** A page is a single blob of HTML. Layout changes (split sections, image with text, hero blocks, CTAs) require either custom HTML written in the rich-text editor — fragile, no design-system constraints — or post-hoc theme work.
- **No per-page layout discipline.** Two pages built in the rich-text editor can look wildly different in ways the design system cannot catch.
- **Editorial drift.** Styles, spacing, and component choices made inline by editors break on theme updates and resist refactoring.
- **Tight coupling to Shopify's editor.** Page content lives in `page.content` as opaque HTML, not as a structured set of sections + blocks. Migrating to a different CMS or restructuring the page later means HTML scraping.

The grilling pass (Q9) of the iteration-1 plan made this an explicit decision: editors will never use Shopify's native rich-text `page.content` as the rendering source for pages on this theme.

## Decision

### Pages are section-composed via the theme editor

Every page on this storefront is composed in the theme editor by adding sections and blocks to a section-composed page template. The merchant edits structured content (per-block settings) inside sections built by developers, not free-form HTML.

### `templates/page.json` is the section-composed default

`templates/page.json` is itself a section-composed template. Every page in Shopify Admin (created without picking a template suffix) uses it. The template renders a `main-page` section that exposes `{% content_for 'blocks' %}` — merchants compose the page entirely from blocks dropped into that section in the theme editor.

The base `templates/page.json` is intentionally **not** a "render `page.content`" stub. There is no fallback that auto-renders the rich-text body. If a merchant writes content in the page rich-text editor and the theme has no block configured to display it, that content does not appear on the storefront. This is the desired behaviour: it forces structured authoring through blocks.

### Alternate page layouts are template suffixes

When a page needs a layout that differs structurally from the default (e.g. a story-style page with hero + columns + image gallery, vs. a generic page with text + image-with-text), that layout is added as a template suffix:

- `templates/page.story.json` — story layout (hero + columns + gallery blocks)
- `templates/page.contact.json` — contact layout (form block + map block + opening hours)

Merchants pick the suffix per page in Shopify Admin (the "Theme template" picker on the page edit screen). The default `templates/page.json` is the fallback for pages where no suffix is chosen.

### `page.content` is opt-in via a dedicated block

If a specific page does need to render the rich-text body (e.g. a legacy page that was authored in the Shopify rich-text editor before the section-composed model existed), that requires explicitly adding a "Page content" block to the page in the theme editor. The block renders `{{ page.content }}` inside a constrained typography wrapper.

This block is opt-in and per-page; it is never the default rendering path. The block exists as an escape hatch, not a recommendation.

## Consequences

### Positive

- **Structured authoring by default.** Every page is composed of typed, validated blocks with developer-defined settings. Layout discipline is enforced by the section/block schema.
- **Design system survives.** Spacing, colour, typography choices are owned by block templates, not by editors writing inline HTML. Theme refactors (e.g. token renames) propagate to all pages without per-page cleanup.
- **Per-layout templates compose cleanly.** Adding a new page layout is `templates/page.<suffix>.json` + maybe new section types; merchants pick it from the admin dropdown. No code change per page.
- **Migration is structured.** Page content is a tree of section + block instances with typed settings, not opaque HTML. Future migrations (to a headless CMS, to a different theme, to a different commerce platform) operate on data, not on scraping HTML.
- **The default template enforces the rule.** Because `templates/page.json` itself is section-composed, even merchants who don't know about template suffixes get the right behaviour by default.

### Negative

- **Onboarding friction.** Merchants used to Shopify's rich-text page editor will write content there and find it doesn't appear. Mitigated by: (a) documenting this in the merchant-facing handoff docs; (b) the opt-in "Page content" block as an escape hatch; (c) the theme editor itself surfaces "no content" clearly when a page has no blocks.
- **Every page layout shape is a developer task.** Editors cannot invent new layouts in the rich-text editor; they pick from developer-built templates. This is the trade-off and it is intentional — but it does mean the team must be willing to ship new `page.<suffix>.json` files when new layouts are needed.
- **Shopify Admin's "Pages" UI still shows the rich-text editor.** Merchants will see it and can write into it; it just won't render on the storefront unless the "Page content" block is added. The merchant-facing handoff docs must call this out.
- **The "Page content" escape-hatch block is a re-litigation surface.** Every time a merchant wants to "just write the page in the editor", someone may suggest making this block the default in `templates/page.json`. The answer is no; that's the rule this ADR exists to encode.

## Future reviews

- Revisit if a third-party CMS is integrated (e.g. Sanity, Contentful) that owns page content. At that point `page.content` is even less relevant; the block model already maps to structured CMS content cleanly.
- Revisit if Shopify ships a meaningfully different page-authoring model (e.g. structured blocks native to `page.content`). The decision tree changes if Shopify's default becomes structured.
- Revisit if the "Page content" escape-hatch block is being added to most pages — that's a signal the section-composed templates are missing a common layout, and we should build it as a `page.<suffix>.json` instead.
