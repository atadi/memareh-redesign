// Domain layer for article business logic.
//
// Generic utilities (src/lib/*) now delegate to these modules so that article
// business rules live in one cohesive place. Consumers can import from either
// the domain barrel or the legacy src/lib paths (kept as re-exports for
// backward compatibility).
export * from './optimizer'
export * from './textIntegrity'
export * from './audit'
