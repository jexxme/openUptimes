# OpenUptimes Documentation

This directory contains the documentation for OpenUptimes, built with [MkDocs Material](https://squidfunk.github.io/mkdocs-material/).

## Working with the Documentation

### Local Development

1. Set up a Python virtual environment:

```bash
python -m venv docs-env
source docs-env/bin/activate  # On Windows: docs-env\Scripts\activate
```

2. Install MkDocs Material:

```bash
pip install mkdocs-material
```

3. Run the local development server:

```bash
mkdocs serve
```

4. View the documentation at [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

### Adding Content

* Add new markdown files to the appropriate subdirectory
* Update `mkdocs.yml` to include new pages in the navigation
* Place images and other assets in the `docs/assets/` directory

### Deployment

Documentation is automatically deployed to GitHub Pages when changes are pushed to the main branch.

You can manually deploy using:

```bash
mkdocs gh-deploy
```

### Style Guide

1. Use ATX-style headers (`#`, not underlines)
2. Use fenced code blocks with language specifiers
3. Follow the existing directory structure

## Customization

The documentation theme is customized to match the OpenUptimes design system. See `docs/stylesheets/extra.css` for the custom styles.

Theme customization options are defined in `mkdocs.yml`. 