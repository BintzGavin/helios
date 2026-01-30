# Plan: CORE - Implement Recursive Animation Discovery in DomDriver

## 1. Context & Goal
- **Objective**: Extend `DomDriver` to discover and synchronize Web Animations (WAAPI/CSS) located within Shadow DOM boundaries.
- **Trigger**: Vision Gap - `DomDriver` currently uses `scope.getAnimations()` which (depending on browser/spec interpretation for `subtree: true`) typically does not descend into open Shadow Roots, causing broken previews for Web Components using CSS animations.
- **Impact**: Ensures "What You See Is What You Get" parity between Preview (driven by `DomDriver`) and Render (driven by `SeekTimeDriver` and `CDP`), specifically for modern Web Component-based architectures.

## 2. File Inventory
- **Modify**: `packages/core/src/drivers/DomDriver.ts`
  - Add `private scopes: Set<Node>` property.
  - Update `init`, `scanAndAdd`, `scanAndRemove` to manage the set of scopes (Document and ShadowRoots).
  - Update `syncWaapiAnimations` to iterate over `scopes` and aggregate animations.
- **Modify**: `packages/core/src/drivers/DomDriver.test.ts`
  - Add test case verifying animation control inside a Shadow Root.

## 3. Implementation Spec
- **Architecture**:
  - Instead of traversing the DOM on every `update()` (which is expensive), we will maintain a `Set<Node>` called `scopes`.
  - The `scopes` set will initially contain the root scope (Document or Element).
  - When nodes are added (via `init` or `MutationObserver`), we recursively scan them for *Open Shadow Roots* and add those Shadow Roots to `scopes`.
  - When nodes are removed, we recursively scan them and remove corresponding Shadow Roots from `scopes`.
  - In `syncWaapiAnimations(time)`, we simply iterate `this.scopes` and call `.getAnimations({ subtree: true })` on each.

- **Pseudo-Code**:
  ```typescript
  export class DomDriver implements TimeDriver {
    // ...
    private scopes = new Set<Node>(); // Document | ShadowRoot | Element

    init(scope: HTMLElement | Document) {
      // ...
      this.scopes.clear();
      this.scopes.add(scope);
      // Initial scan for nested shadow roots
      this.scanForShadowRoots(scope);
      // ...
    }

    private scanForShadowRoots(root: Node) {
       // Recursive walker to find Shadow Roots
       // If node.shadowRoot, add to this.scopes, and recurse into it
       const walker = (node: Node) => {
         if (node instanceof Element && node.shadowRoot) {
           this.scopes.add(node.shadowRoot);
           walker(node.shadowRoot);
         }
         // Iterate children
         node.childNodes.forEach(child => walker(child));
       };
       walker(root);
    }

    private removeShadowRoots(root: Node) {
       // Recursive walker to remove Shadow Roots
       const walker = (node: Node) => {
         if (node instanceof Element && node.shadowRoot) {
           this.scopes.delete(node.shadowRoot);
           walker(node.shadowRoot);
         }
         node.childNodes.forEach(child => walker(child));
       };
       walker(root);
    }

    // Updates to scanAndAdd / scanAndRemove to call scanForShadowRoots / removeShadowRoots
    // private scanAndAdd(node: Node) {
    //    // existing logic for media elements...
    //    this.scanForShadowRoots(node);
    // }

    private syncWaapiAnimations(timeInMs: number) {
      let anims: Animation[] = [];
      for (const scope of this.scopes) {
         // Check if getAnimations exists (it should on Document/ShadowRoot/Element)
         if (typeof (scope as any).getAnimations === 'function') {
            const scopeAnims = (scope as any).getAnimations({ subtree: true });
            scopeAnims.forEach((a: Animation) => anims.push(a));
         }
      }

      anims.forEach((anim: Animation) => {
        anim.currentTime = timeInMs;
        if (anim.playState !== 'paused') {
          anim.pause();
        }
      });
    }
  }
  ```

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - Create a test case in `DomDriver.test.ts`:
    ```typescript
    it('should sync animations inside Shadow DOM', () => {
       const host = document.createElement('div');
       const shadow = host.attachShadow({ mode: 'open' });
       const div = document.createElement('div');
       // Mock getAnimations on shadow root
       shadow.getAnimations = vi.fn().mockReturnValue([mockAnim]);

       driver.init(host); // Should find shadow root
       driver.update(1000);

       expect(mockAnim.currentTime).toBe(1000);
    });
    ```
- **Edge Cases**:
  - Closed Shadow Roots (ignored).
  - Deeply nested Shadow Roots.
  - Removing a host element should remove its shadow root from `scopes` to prevent leaks/errors.
