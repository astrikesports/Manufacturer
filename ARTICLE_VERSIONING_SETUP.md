# Article Master Versioning

The Article Master UI layout is preserved. Editing an existing article now creates a new immutable version rather than overwriting the previous row. Existing Lots remain linked to their original article-version ID; new Lots offer only the current version by default. Material unit rates and GST rates are frozen in each article version so historical costing does not drift when Raw Material Master prices change.

## Supabase setup (required once)

Before running the updated app against the existing Supabase project, apply this migration in the Supabase SQL Editor:

`supabase/migrations/20261027090000_article_master_versioning.sql`

The migration preserves existing article IDs and Lot references, marks existing articles as Version 1, and adds version/rate-snapshot fields. Do not manually delete the old Article Master rows to apply this change.

## Behaviour

- New article: starts at Version 1.
- Edit existing article: creates Version 2, Version 3, etc.; the main article code stays the same.
- Old versions and Lots linked to them retain their previous recipe and frozen rates.
- New Lots select the current version by default.
- Article History shows version history and the existing change log.
