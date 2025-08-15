# Makefile for Geobase AI Development

.PHONY: help install install-examples clean docs-build docs-dev examples-dev list-models check-videos dev-setup dev-cycle full-dev

# Default target
help:
	@echo "Geobase AI Development Commands"
	@echo "==============================="
	@echo ""
	@echo "Quick Commands (use pnpm directly for these):"
	@echo "  pnpm dev      - Start development server"
	@echo "  pnpm build    - Build for production"
	@echo "  pnpm test     - Run tests"
	@echo "  pnpm lint     - Run linting"
	@echo "  pnpm format   - Format code"
	@echo ""
	@echo "Make-specific Commands:"
	@echo "  install       - Install all dependencies (root + docs + examples)"
	@echo "  install-examples - Install only examples dependencies"
	@echo "  clean         - Clean all build artifacts"
	@echo "  docs-build    - Build documentation"
	@echo "  docs-dev      - Start documentation dev server"
	@echo "  examples-dev  - Start examples dev server"
	@echo ""
	@echo "Workflows:"
	@echo "  dev-setup     - Complete development setup (install + build + test)"
	@echo "  dev-cycle     - Quick development cycle (build + test)"
	@echo "  full-dev      - Full development workflow (clean + install + build + test + lint)"
	@echo ""
	@echo "Utility:"
	@echo "  list-models   - List all available models"
	@echo "  check-videos  - Check for expected MP4 files"

# Install all dependencies (root + docs + examples)
install:
	@echo "Installing root dependencies..."
	pnpm install
	@echo "Installing documentation dependencies..."
	cd docs && pnpm install
	@echo "Installing examples dependencies..."
	@echo "  - next-geobase..."
	cd examples/next-geobase && pnpm install
	@echo "  - 01-quickstart..."
	cd examples/01-quickstart && npm install
	@echo "  - 02-quickstart-with-workers..."
	cd examples/02-quickstart-with-workers && npm install

# Install only examples dependencies
install-examples:
	@echo "Installing examples dependencies..."
	@echo "  - next-geobase..."
	cd examples/next-geobase && pnpm install
	@echo "  - 01-quickstart..."
	cd examples/01-quickstart && npm install
	@echo "  - 02-quickstart-with-workers..."
	cd examples/02-quickstart-with-workers && npm install

# Clean all build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf build/
	rm -rf dist/
	rm -rf node_modules/.vite/
	rm -rf .vitest/
	rm -rf coverage/
	@echo "Cleaning documentation build..."
	cd docs && rm -rf .next/ out/
	@echo "Cleaning examples build..."
	cd examples/next-geobase && rm -rf .next/ out/
	cd examples/01-quickstart && rm -rf build/ node_modules/
	cd examples/02-quickstart-with-workers && rm -rf build/ node_modules/

# Build documentation
docs-build:
	@echo "Building documentation..."
	cd docs && pnpm build

# Start documentation dev server
docs-dev:
	@echo "Starting documentation dev server..."
	cd docs && pnpm dev

# Start examples dev server
examples-dev:
	@echo "Starting examples dev server..."
	cd examples/next-geobase && pnpm dev

# List all models (from docs Makefile)
list-models:
	@echo "Available models in Geobase AI library:"
	@echo "======================================"
	@grep -E 'task: "' src/registry.ts | sed 's/.*task: "\([^"]*\)".*/- \1/' | sort
	@echo ""
	@echo "Total models: $$(grep -c 'task: "' src/registry.ts)"

# Check for expected MP4 files per model (from docs Makefile)
check-videos:
	@echo "Checking for expected MP4 files per model:"
	@echo "=========================================="
	@for model in $$(grep -E 'task: "' src/registry.ts | sed 's/.*task: "\([^"]*\)".*/\1/' | sort); do \
		case "$$model" in \
			"car-detection") video_file="examples/next-geobase/public/video/car-detection-model.mp4" ;; \
			*) video_file="examples/next-geobase/public/video/$${model}.mp4" ;; \
		esac; \
		if [ -f "$$video_file" ]; then \
			echo "✅ $$model.mp4 - Found"; \
		else \
			echo "❌ $$model.mp4 - Missing"; \
		fi; \
	done

# Development workflow: install, build, test
dev-setup: install
	@echo "Building for production..."
	pnpm build
	@echo "Running tests..."
	pnpm test
	@echo "Development setup complete!"

# Quick development cycle: build and test
dev-cycle:
	@echo "Building for production..."
	pnpm build
	@echo "Running tests..."
	pnpm test
	@echo "Development cycle complete!"

# Full development workflow: clean, install, build, test, lint
full-dev: clean install
	@echo "Building for production..."
	pnpm build
	@echo "Running tests..."
	pnpm test
	@echo "Running linting..."
	pnpm lint:scripts
	@echo "Full development workflow complete!"
