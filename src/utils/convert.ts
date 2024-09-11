export const extractValueFromNodeProperty = <T> (property: T[] | T ) : T => {
    if (Array.isArray(property)) {
        return property[0];
    }

    return property;
}
