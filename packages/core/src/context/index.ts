export type { ContextData, ContextMetadata, ContextRecord, ContextCollections } from './types';
export { loadJsonContext } from './loaders/jsonLoader';
export { loadCsvContext } from './loaders/csvLoader';
export {
	isContextReferenceExpression,
	parseContextReferenceExpression,
	resolveContextReferenceExpression,
	type ContextReferenceExpression,
	type ContextReferenceSelector,
} from './contextReference';
