# Spike Prototypes

Time-boxed technical spikes for feasibility validation and experimentation.

**NOT PRODUCTION CODE** - These are proofs-of-concept only.

## Active Spikes

### xoshiro256-prng-validation.ts
**Status:** In Progress  
**Time-box:** 3-4 hours  
**Purpose:** Validate Xoshiro256** PRNG feasibility for deterministic data generation

**Run:**
```bash
bun run spike/xoshiro256-prng-validation.ts
```

**Validation Goals:**
- ✓ Same seed → same sequence
- ✓ Different seeds → different sequences  
- ✓ Float generation quality
- ✓ Integer range handling
- ✓ State consistency

---

## Guidelines

1. **Time-boxed:** Set clear time limit
2. **Focused:** One question per spike
3. **Disposable:** Code quality is secondary to learning
4. **Documented:** Record findings and decision
5. **Isolated:** Keep separate from production codebase
