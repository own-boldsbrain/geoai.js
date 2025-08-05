# TODO

## Route Path Consistency Check

### Task: Check route paths in @examples/ and @docs/ match task names

**Status**: 🔄 Pending

**Description**: Verify that the route paths in the examples application and documentation pages match the task names from the registry.

**Files to check**:
- `examples/next-geobase/src/app/tasks/` - Check route folders match task names
- `docs/pages/supported-tasks/` - Check MDX files match task names
- `examples/next-geobase/src/app/page.tsx` - Check href links match task names

**Expected consistency**:
- Task name: `car-detection` → Route: `/tasks/car-detection`
- Task name: `solar-panel-detection` → Route: `/tasks/solar-panel-detection`
- Task name: `building-footprint-segmentation` → Route: `/tasks/building-footprint-segmentation`

**Registry task names**:
1. `zero-shot-object-detection`
2. `mask-generation`
3. `object-detection`
4. `oriented-object-detection`
5. `land-cover-classification`
6. `solar-panel-detection`
7. `ship-detection`
8. `car-detection`
9. `wetland-segmentation`
10. `building-detection`
11. `oil-storage-tank-detection`
12. `building-footprint-segmentation`

**Action needed**: Compare each task name with corresponding route paths and fix any mismatches. 