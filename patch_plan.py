import re

with open(".sys/plans/PERF-362-avoid-promise-race.md", "r") as f:
    content = f.read()

# Fix the missing reject handling in the proposed JS
old_js = """              const timeoutId = setTimeout(finish, timeoutMs);
              Promise.all(promises).then(finish);
            });"""

new_js = """              const timeoutId = setTimeout(finish, timeoutMs);
              Promise.all(promises).then(finish).catch((err) => {
                console.error('[SeekTimeDriver] Stability check promise rejected:', err);
                finish();
              });
            });"""

content = content.replace(old_js, new_js)

with open(".sys/plans/PERF-362-avoid-promise-race.md", "w") as f:
    f.write(content)
