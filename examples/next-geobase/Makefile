# Variables
REGISTRY_PATH = ../../src/registry.ts

.PHONY: help check-routes check-task-names check-links check-registry check-all

# Default target
help:
	@echo "Available targets:"
	@echo "  check-routes      - Check if route directories match registry task names"
	@echo "  check-task-names  - Check if task names in code match registry"
	@echo "  check-links       - Check if index page links match actual routes"
	@echo "  check-registry    - Show all tasks from registry.ts"
	@echo "  check-all         - Run all checks"

# Get all task names from registry.ts
check-registry:
	@echo "=== Tasks from registry.ts ==="
	@grep -o 'task: "[^"]*"' $(REGISTRY_PATH) | sed 's/task: "//' | sed 's/"//' | sort

# Check if route directories match registry task names
check-routes:
	@echo "=== Checking route directories ==="
	@echo "Expected routes (from registry):"
	@grep -o 'task: "[^"]*"' $(REGISTRY_PATH) | sed 's/task: "//' | sed 's/"//' | sort > /tmp/expected_routes.txt
	@cat /tmp/expected_routes.txt
	@echo ""
	@echo "Actual route directories:"
	@find src/app/tasks -type d -name "*" | sed 's|src/app/tasks/||' | sed 's|/||' | sort > /tmp/actual_routes.txt
	@cat /tmp/actual_routes.txt
	@echo ""
	@echo "=== Route Directory Analysis ==="
	@echo "Routes that should exist but don't:"
	@comm -23 /tmp/expected_routes.txt /tmp/actual_routes.txt || true
	@echo ""
	@echo "Routes that exist but aren't in registry:"
	@comm -13 /tmp/expected_routes.txt /tmp/actual_routes.txt || true
	@echo ""
	@echo "Routes that match registry:"
	@comm -12 /tmp/expected_routes.txt /tmp/actual_routes.txt || true

# Check if task names in code files match registry
check-task-names:
	@echo "=== Checking task names in code files ==="
	@echo "Task names found in code files:"
	@grep -r "task:" src/app/tasks/ --include="*.tsx" | sed 's/.*task: "//' | sed 's/".*//' | sort | uniq
	@echo ""
	@echo "=== Task Name Analysis ==="
	@echo "Tasks in code that match registry:"
	@grep -r "task:" src/app/tasks/ --include="*.tsx" | sed 's/.*task: "//' | sed 's/".*//' | sort | uniq > /tmp/code_tasks.txt
	@grep -o 'task: "[^"]*"' $(REGISTRY_PATH) | sed 's/task: "//' | sed 's/"//' | sort > /tmp/registry_tasks.txt
	@comm -12 /tmp/code_tasks.txt /tmp/registry_tasks.txt || true
	@echo ""
	@echo "Tasks in code that are NOT in registry:"
	@comm -23 /tmp/code_tasks.txt /tmp/registry_tasks.txt || true

# Check if index page links match actual routes
check-links:
	@echo "=== Checking index page links ==="
	@echo "Links found in index page:"
	@grep -o 'href="/tasks/[^"]*"' src/app/page.tsx | sed 's/href="\/tasks\///' | sed 's/"//' | sort
	@echo ""
	@echo "=== Link Analysis ==="
	@echo "Links that match actual routes:"
	@grep -o 'href="/tasks/[^"]*"' src/app/page.tsx | sed 's/href="\/tasks\///' | sed 's/"//' | sort > /tmp/index_links.txt
	@find src/app/tasks -type d -name "*" | sed 's|src/app/tasks/||' | sed 's|/||' | sort > /tmp/actual_routes.txt
	@comm -12 /tmp/index_links.txt /tmp/actual_routes.txt || true
	@echo ""
	@echo "Links that don't match any route:"
	@comm -23 /tmp/index_links.txt /tmp/actual_routes.txt || true

# Check for any old route directories that should be removed
check-old-routes:
	@echo "=== Checking for old route directories ==="
	@echo "Looking for old route names that should be renamed:"
	@if ls src/app/tasks/ | grep -E "(land-cover$|solar-panel$|oil-storage-tank$|building-footprint$|zero-shot$)" > /dev/null 2>&1; then \
		echo "Found old route directories:"; \
		ls src/app/tasks/ | grep -E "(land-cover$|solar-panel$|oil-storage-tank$|building-footprint$|zero-shot$)"; \
	else \
		echo "No old route directories found ✓"; \
	fi

# Check for empty route directories
check-empty-routes:
	@echo "=== Checking for empty route directories ==="
	@for dir in src/app/tasks/*/; do\
		if [ ! -f "$$dir/page.tsx" ]; then \
			echo "Empty directory: $$dir"; \
		fi; \
	done

# Run all checks
check-all: check-registry check-routes check-task-names check-links check-old-routes check-empty-routes
	@echo ""
	@echo "=== Summary ==="
	@echo "✓ Registry tasks: $$(grep -c 'task:' src/registry.ts)"
	@echo "✓ Route directories: $$(find src/app/tasks -type d -name "*" | wc -l | tr -d ' ')"
	@echo "✓ Index page links: $$(grep -c 'href="/tasks/' src/app/page.tsx)"
	@echo ""
	@echo "All checks completed!"



# Quick status check
status:
	@echo "=== Quick Status Check ==="
	@echo "Registry tasks: $$(grep -c 'task:' $(REGISTRY_PATH))"
	@echo "Route directories: $$(find src/app/tasks -type d -name "*" | wc -l | tr -d ' ')"
	@echo "Index page links: $$(grep -c 'href="/tasks/' src/app/page.tsx)"
	@echo ""
	@echo "Expected vs Actual routes:"
	@grep -o 'task: "[^"]*"' $(REGISTRY_PATH) | sed 's/task: "//' | sed 's/"//' | sort > /tmp/expected.txt
	@find src/app/tasks -type d -name "*" | sed 's|src/app/tasks/||' | sed 's|/||' | sort > /tmp/actual.txt
	@if cmp -s /tmp/expected.txt /tmp/actual.txt; then \
		echo "✓ All routes match registry!"; \
	else \
		echo "✗ Routes don't match registry"; \
		echo "Missing: $$(comm -23 /tmp/expected.txt /tmp/actual.txt | wc -l)"; \
		echo "Extra: $$(comm -13 /tmp/expected.txt /tmp/actual.txt | wc -l)"; \
	fi
	@echo ""
	@echo "Note: Temporary files created in /tmp/ are automatically cleaned up" 