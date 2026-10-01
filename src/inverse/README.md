# src/inverse/

**Ownership**: WS-C

This module covers inverse programming: target image upload, error metrics, optimizer, AI-editable loop, and compression demo (steps 12, 13, 14, 15, 22, 23, 24, 28).

## Error Metrics API

This module exports functions to compute the error between a target image and a rendered image in `src/inverse/errorMetric.ts`:

- `mse(target: ImageDataLike, render: ImageDataLike): number` - Computes the Mean Squared Error (MSE).
- `mae(target: ImageDataLike, render: ImageDataLike): number` - Computes the Mean Absolute Error (MAE).

### UI Wiring Subscription Contract

To wire the error metrics to the live display (which requires integration in `src/app/**` and `src/ui/**` by the build foreman), use the following subscription contract concept:

```typescript
// Proposed signature for the integration step:
type ErrorMetricCallback = (errorValues: { mse: number; mae: number }) => void;
type UnsubscribeFunc = () => void;

// The app shell would call a registration function like:
// function subscribeToErrorMetrics(callback: ErrorMetricCallback): UnsubscribeFunc;
```

*(Note: The actual registration function will be implemented during the integration step. Do not modify `src/app/**` or `src/ui/**` from this module.)*