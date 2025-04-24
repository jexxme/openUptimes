# Deploying Documentation to GitHub Pages

This guide explains how to deploy the OpenUptimes documentation to GitHub Pages.

## Automatic Deployment

The documentation is automatically deployed to GitHub Pages whenever changes are pushed to the `main` branch that affect:
- Files in the `docs/` directory
- The `mkdocs.yml` configuration file
- The GitHub Actions workflow file

This is handled by the GitHub Actions workflow defined in `.github/workflows/documentation.yml`.

## Manual Deployment

If you need to deploy the documentation manually:

1. Ensure you have MkDocs Material installed:

```bash
pip install mkdocs-material
```

2. From the project root, run:

```bash
mkdocs gh-deploy --force
```

This command builds the documentation and pushes it to the `gh-pages` branch, which is then served by GitHub Pages.

## Deployment Settings

The documentation is deployed to: `https://[username].github.io/openuptimes/`

### GitHub Repository Settings

To ensure GitHub Pages works correctly:

1. Go to your repository's **Settings** tab
2. Navigate to **Pages** in the sidebar
3. Under **Source**, select **Deploy from a branch**
4. Select the **gh-pages** branch and **/ (root)** folder
5. Click **Save**

## Troubleshooting

### Images Not Displaying

- Ensure images are in the `docs/assets/` directory
- Check that image paths in markdown files are correct
- Use relative paths from the current markdown file (e.g., `../assets/image.png`)

### Styling Issues

- Check that `extra_css` in `mkdocs.yml` points to the correct file
- Verify that custom CSS is compatible with MkDocs Material
- Test locally with `mkdocs serve` before deploying

### Deployment Failures

- Check the GitHub Actions workflow runs for errors
- Ensure the repository has the necessary permissions
- Verify that the `gh-pages` branch exists 