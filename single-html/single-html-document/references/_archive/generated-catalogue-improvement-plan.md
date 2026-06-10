# Generated Catalogue Single HTML Improvement Plan

This plan is for improving generated catalogue-style outputs using the same approach as the current samples: content first, normal site first, packaged single HTML last.

## Keep

- Single-file HTML distribution.
- Structured Markdown records as the source of truth.
- Search and filter behaviour in the main catalogue.
- Bespoke circulation pages for important protocols and meetings.
- Strong institutional tone.
- Print-aware CSS.

## Improve

1. Create shared design tokens.
   Define institutional colours, status colours, spacing, typography, border, and focus tokens once.

2. Split page archetypes.
   Do not use one layout for every output. Use:
   - Record Catalogue for structured record inventories
   - Protocol Dossier for single protocol share pages
   - Committee Briefing for meeting notes and committee packs
   - Tabbed Workshop for live facilitation or presentation mode

3. Move icons into React components.
   Use `lucide-react` in source components, import only the icons needed, and let the single-file packager inline the bundled SVG output.

4. Improve long record handling.
   Keep summary cards compact, but add source/provenance drawers and detail expansion rather than relying on fixed-height text boxes alone.

5. Make controls accessible.
   Filters, tabs, and toggles should have labels, keyboard support, visible focus, and clear active state.

6. Preserve source text.
   Every local Markdown record used to generate a share page should be inspectable in the final page when it matters for provenance.

7. Add audit gates.
   Every generated catalogue/share page should pass:

   ```bash
   node single-html-document/scripts/audit-single-html.mjs <file> --strict
   ```

## Suggested Component Set

- `AppShell`
- `InstitutionalHeader`
- `FilterSidebar`
- `RecordCard`
- `StatusPill`
- `MetadataGrid`
- `SourceDrawer`
- `ProtocolHero`
- `FactRail`
- `CommitteeLanding`
- `SectionNav`
- `TabbedBriefing`
- `ArtifactDownload`

## Lucide Icon Map

| Component | Icons |
| --- | --- |
| Search/filter | `Search`, `SlidersHorizontal`, `Filter`, `X` |
| Records | `FileText`, `FileCheck2`, `ScrollText`, `Tag` |
| Risk/protocol | `ShieldAlert`, `ShieldCheck`, `FileWarning`, `ListChecks` |
| People/owners | `UserRound`, `UsersRound`, `Contact` |
| Dates/timing | `Calendar`, `CalendarClock`, `Clock` |
| Navigation | `Home`, `PanelLeftClose`, `ChevronRight`, `ArrowLeft` |
| Artifacts | `Download`, `FileSpreadsheet`, `FileArchive`, `ExternalLink` |
| Presentation | `Presentation`, `PlayCircle`, `MessagesSquare` |

## Acceptance Criteria

- The catalogue remains dense and filterable.
- Protocol pages look more polished without becoming marketing pages.
- Meeting pages open with a clear overview and decision context.
- Tabbed pages can be used live in a workshop.
- Source Markdown is incorporated into final HTML where it supports provenance.
- CSV/PDF/spreadsheet downloads are preserved only when they are real artifacts.
- No final page requires adjacent CSS, JS, images, Markdown, or JSON files.
