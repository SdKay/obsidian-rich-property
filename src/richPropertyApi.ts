// The contract with Rich Search for reading the property rules. Both plugins keep a copy of these
// declarations; change them together, and only by adding optional members.

export interface RichPropertyApi {
	apiVersion: 1;
	/** Every known property. May be empty; an empty list is a normal answer. */
	fields(): PropertyField[];
	/**
	 * The legal values of a property, or undefined when it has no fixed list.
	 * `type` narrows to one note type. Omitted: the union over all types, de-duplicated by `value`.
	 * An unknown `type` returns the union, not an error. For several chosen types the caller uses the union.
	 */
	valuesOf(key: string, type?: string): PropertyValue[] | undefined;
	/** Calls `listener` when the rules change. Returns a function that stops the calls. */
	onChange(listener: () => void): () => void;
}

export interface PropertyField {
	key: string;
	/** What a value of this property is. */
	valueType: ValueType;
	/** Text already in the UI language of the moment. */
	description?: string;
	/** The note types this applies to. Absent = every type. */
	types?: string[];
}

export type ValueType = 'text' | 'list' | 'number' | 'boolean' | 'date' | 'datetime';

export interface PropertyValue {
	value: string;
	/** A token: red, orange, yellow, green, cyan, blue, purple, pink, neutral. Unknown tokens are drawn as neutral. */
	color?: string;
	solid?: boolean;
	/** Text already in the UI language of the moment. */
	description?: string;
}
