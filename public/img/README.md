# Game image assets

Binary art files are not stored in this repository. After cloning, add your images to the folders below:

- `public/img/decks/<deck>/characters/` – `char1.png` … `char10.png`
- `public/img/decks/<deck>/tools/`
- `public/img/decks/<deck>/bufs/` and `public/img/decks/<deck>/effects/`
- `public/img/decks/<deck>/card-backs/` – front background named `<deck-abbrev>-cb-default.webp`
- `public/img/decks/<deck>/deck-backs/` – card back named `<deck-abbrev>-db-default.webp`
- `public/img/mana/mana.png` – sprite sheet with six colored mana gems
- `public/img/ui/logos/logo.png` – main game logo
- `public/img/ui/backgrounds/` – screen backgrounds

These paths are referenced at runtime for card art, card backs, logos and effects.
