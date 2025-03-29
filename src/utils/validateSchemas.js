import Joi from "joi";

// Validation Schemas
const validationSchemas = {
    services: Joi.object({
        title: Joi.string().required().messages({
            "string.empty": "Service name is required",
            "any.required": "Service name is required",
        }),
        description: Joi.string().required(),
        price: Joi.number().required(),
        basis: Joi.string().required(),
    }),
    previousWork: Joi.object({
        image: Joi.string().required(),
    }),
    featuredWork: Joi.object({
        image: Joi.string().required(),
    }),
    testimonials: Joi.object({
        name: Joi.string().required(),
        position: Joi.string().required(),
        text: Joi.string().required(),
        image: Joi.string().required(),
    }),
    textBlock: Joi.object({
        description: Joi.string().required(),
    }),
    stats: Joi.object({
        title: Joi.string().required(),
        value: Joi.number().required(),
    }),
    calendar: Joi.object({
        title: Joi.string().required(),
        date: Joi.string().required(),
        color: Joi.string().required(),
    }),
    // Add more validation schemas as needed...
};

// Generic Validation Function
function validateFieldData(field, data) {
    if (!validationSchemas[field]) throw new Error(`Validation for ${field} not found`);

    const { error } = validationSchemas[field].validate(data);
    const stringError = error && error.details.map((err) => err.message).join(", ");
    if (error) throw new Error(stringError);
}

export default validateFieldData;
