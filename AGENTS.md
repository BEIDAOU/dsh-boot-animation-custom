# Maintainer notes

This package is a derivative of lxj5820/dsh-boot-animation. Preserve upstream copyright and licensing. Runtime behavior is intentionally frozen for this publication.

- Read and write UTF-8 with Node.js; do not round-trip source or profile files through PowerShell text encodings.
- Do not edit the user's installed profile or dependencies during development or tests.
- Shared Host settings use volatile Config fields. Read their live references through readField().
- The extra welcome voice has a default-on switch. It does not remove sound embedded in video files.
- The existing own-voice clip exception, welcome timing, entry behavior and video/audio fade timing are user-approved behavior. Do not change them as a routine cleanup.
- Keep the in-flight welcome lock and old-preview cleanup. Test near-tail clicks and repeated previews.
- Rebuild lib/client.js with `node build-client.mjs` after changing src/client.js.
- Run `npm test` and `npm run check`. Copy any temporary dependency trees with dereference enabled; never modify shared links.
- Keep personal paths, credentials, chat history, crash logs, model weights and node_modules out of releases.
- Code and media have different licensing scopes; preserve CREDITS.md and LICENSE.
