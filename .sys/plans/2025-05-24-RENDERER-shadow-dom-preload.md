#### 1. Context & Goal
- **Objective**: Update `DomStrategy` to recursively find and preload CSS background images inside Shadow DOMs.
- **Trigger**: `DomStrategy` currently uses `document.querySelectorAll('*')` which misses Shadow DOM content, causing visual artifacts (missing backgrounds) when rendering Web Components.
- **Impact**: Ensures robust "Zero Artifact" rendering for modern applications using Shadow DOM.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Update `prepare` script to use recursive TreeWalker)
- **Create**: `packages/renderer/tests/verify-shadow-dom-background.ts` (New verification script)
- **Read-Only**: `packages/renderer/src/utils/dom-scanner.ts` (Reference for TreeWalker pattern)

#### 3. Implementation Spec
- **Architecture**:
    - Update the injected script in `DomStrategy.prepare()`.
    - Replace the `getAllElements` arrow function with a robust `findAllElements(root)` helper.
    - `findAllElements` uses `document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)`.
    - It iterates all nodes.
    - If `node.shadowRoot` exists, it recursively calls `findAllElements(node.shadowRoot)` and merges results.
    - The returned array is then used to extract `backgroundImage`.
- **Pseudo-Code**:
    ```javascript
    FUNCTION prepare(page)
      DEFINE script
        FUNCTION findAllElements(root)
          SET elements = []
          IF root IS Element
             PUSH root TO elements
          END IF
          SET walker = createTreeWalker(root, SHOW_ELEMENT)
          WHILE walker.nextNode()
            PUSH walker.currentNode TO elements
            IF walker.currentNode.shadowRoot
               PUSH findAllElements(walker.currentNode.shadowRoot) TO elements
            END IF
          END WHILE
          RETURN elements
        END FUNCTION

        WAIT fonts.ready
        WAIT document.images

        SET allElements = findAllElements(document)
        FOR EACH el IN allElements
           GET computedStyle
           IF backgroundImage
              PARSE url
              ADD to backgroundUrls
           END IF
        END FOR

        PRELOAD backgroundUrls
      END DEFINE

      EVALUATE script IN frames
    END FUNCTION
    ```

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-shadow-dom-background.ts`
- **Success Criteria**:
    - The test sets up a page with a Shadow Host -> Shadow Root -> Div with `background-image`.
    - `page.route` intercepts the image request.
    - `DomStrategy.prepare()` is called.
    - The test asserts that the image request was made (and potentially waits for it).
- **Edge Cases**:
    - Nested Shadow DOMs (recursive check).
    - `backgroundImage` with multiple URLs.
