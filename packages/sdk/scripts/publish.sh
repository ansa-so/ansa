#!/bin/bash

# Ansa SDK Publish Script
# Publishes the SDK to npm without exposing personal information

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Ansa SDK Publish Script${NC}\n"

# Navigate to SDK directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Check if logged into npm
if ! npm whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged into npm. Run 'npm login' first.${NC}"
    exit 1
fi

NPM_USER=$(npm whoami)
echo -e "${YELLOW}📦 Publishing as: ${NPM_USER}${NC}"

# Warn about identity exposure
echo -e "${YELLOW}⚠️  Warning: Your npm username will be visible on the package page.${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Clean previous builds
echo -e "\n${GREEN}🧹 Cleaning previous builds...${NC}"
rm -rf dist

# Build the package
echo -e "${GREEN}🔨 Building...${NC}"
pnpm build

# Show what will be published
echo -e "\n${GREEN}📋 Files to be published:${NC}"
npm pack --dry-run 2>&1 | grep -E "^npm notice [0-9]" || npm pack --dry-run

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "\n${YELLOW}Current version: ${CURRENT_VERSION}${NC}"

# Ask for version bump
echo -e "\nVersion bump options:"
echo "  1) patch (x.x.X) - bug fixes"
echo "  2) minor (x.X.x) - new features"
echo "  3) major (X.x.x) - breaking changes"
echo "  4) keep current version"
echo "  5) custom version"

read -p "Select option (1-5): " VERSION_OPTION

case $VERSION_OPTION in
    1)
        npm version patch --no-git-tag-version
        ;;
    2)
        npm version minor --no-git-tag-version
        ;;
    3)
        npm version major --no-git-tag-version
        ;;
    4)
        echo "Keeping current version..."
        ;;
    5)
        read -p "Enter custom version: " CUSTOM_VERSION
        npm version "$CUSTOM_VERSION" --no-git-tag-version
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}📦 Publishing version: ${NEW_VERSION}${NC}"

# Final confirmation
read -p "Publish @ansa-so/sdk@${NEW_VERSION} to npm? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted. Reverting version change..."
    git checkout package.json 2>/dev/null || true
    exit 1
fi

# Publish
echo -e "\n${GREEN}🚀 Publishing to npm...${NC}"
npm publish --access public

echo -e "\n${GREEN}✅ Successfully published @ansa-so/sdk@${NEW_VERSION}${NC}"
echo -e "View at: https://www.npmjs.com/package/@ansa-so/sdk"

# Ask to commit version bump
read -p "Commit version bump? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add package.json
    git commit -m "chore(sdk): bump version to ${NEW_VERSION}"
    echo -e "${GREEN}✅ Version bump committed${NC}"
fi
