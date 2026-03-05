# Appendix A — Mathematical Background

Interactive reference for the mathematical foundations used throughout *AI: A Modern Approach, 4th Ed.* (Russell & Norvig).

## Sections

### §A.1 Complexity Analysis and O() Notation
- Growth rate comparison: O(1), O(log n), O(n), O(n log n), O(n²), O(n³), O(2ⁿ), O(n!)
- Big-O definition verification: f(n) ≤ c·g(n) for all n ≥ n₀
- Automatic constant-finding for Big-O relationships

### §A.2 Vectors, Matrices, and Linear Algebra
- Element-wise vector addition and scalar multiplication
- Dot product (inner product)
- Matrix multiplication (arbitrary m×k × k×n)
- Matrix transposition
- 2D linear transformation application
- Eigenvalue computation for 2×2 matrices (real and complex)

### §A.3 Probability Distributions
- **Continuous:** Gaussian (Normal), Uniform, Exponential, Beta
- **Discrete:** Bernoulli, Binomial, Poisson
- Sample statistics: mean and unbiased variance

## Tech Stack

React · TypeScript (strict) · KaTeX · Vite · Vitest

## Running Locally

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm test          # run tests
npm run build     # production build
```

## Testing

```bash
npm test -- --run --coverage
```

All algorithm functions in `src/algorithms/index.ts` have 100% branch and line coverage.
