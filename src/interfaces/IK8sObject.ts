import * as Joi from 'joi';

interface IK8sObject {
    kind: string;
    apiVersion: string;
    metadata: {
        name: string,
        namespace?: string,
        [key: string]: any
    };
    [key: string]: any;
}

const IK8sObject_JOI_SCHEMA = Joi.object({
    kind: Joi.string().required(),
    apiVersion: Joi.string().required(),
    metadata: Joi
        .object({
            name: Joi.string().required(),
            namespace: Joi.string()
        })
        .options({
            abortEarly: true,
            allowUnknown: true,
        })
        .required(),
}).options({
    abortEarly: true,
    allowUnknown: true,
});

export {IK8sObject, IK8sObject_JOI_SCHEMA};
