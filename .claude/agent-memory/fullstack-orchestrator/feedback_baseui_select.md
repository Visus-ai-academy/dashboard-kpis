---
name: Base UI Select onValueChange signature
description: @base-ui/react Select onValueChange passes (value: string | null, eventDetails) — must guard against null
type: feedback
---

The Shadcn UI components in this project use `@base-ui/react` (NOT Radix). The Select `onValueChange` callback signature is `(value: string | null, eventDetails: SelectRootChangeEventDetails) => void`. Always wrap with `(v) => v && setter(v)` instead of passing `setter` directly.

**Why:** Build fails with type error when passing `Dispatch<SetStateAction<string>>` directly since it cannot accept `null`.

**How to apply:** Any time a Select is used with a string state setter, wrap the onValueChange handler to guard against null.
