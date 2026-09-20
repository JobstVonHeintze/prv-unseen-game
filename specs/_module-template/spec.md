# Spec: <Module Name>

- **Status:** draft | reviewed | implemented | deprecated
- **Module:** NN-<module-slug>
- **Depends on:** <list modules or "none">

## Overview

*(2-4 sentences: what this module does, why it exists, what it is NOT responsible for.)*

## Domain Models

*(List canonical types this module produces or consumes. Reference `domain/`.)*

## Contract Interface

*(The abstract interface that goes into `domain/contracts/` (or equivalent).
Specify inputs, outputs, and error cases. Implementation details live in
the module, not here.)*

```
interface <ModuleName> {
  <method>(input: <Type>): Promise<<Type>>
}
```

## Implementation Requirements

- Happy path: ...
- Edge cases: ...
- Error cases: ...
- Performance: ...
- Observability: ...

## Test Requirements

- [ ] Unit tests in `tests/unit/test_<module>/`.
- [ ] Contract test coverage (if part of a preserved chain).
- [ ] Golden fixtures (if the module is deterministic).

## Legacy Porting

*(Delete if greenfield.)*

- **Source:** `path/to/legacy/code`
- **Reusable primitives:** list
- **Adapter strategy:** how legacy maps to the new interface

## Legacy Removal

*(Delete if greenfield.)*

- [ ] `path/to/legacy/file` — replaced by this module

## Open Questions

- [ ] Q1: ?
