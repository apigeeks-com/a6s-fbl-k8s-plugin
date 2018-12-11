import * as Joi from 'joi';

export interface IK8sObject {
    kind: string;
    apiVersion: string;
    metadata: {
        name: string;
        namespace?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

export const k8sObjectJoiSchema = Joi.object({
    kind: Joi.string().required(),
    apiVersion: Joi.string().required(),
    metadata: Joi.object({
        name: Joi.string().required(),
        namespace: Joi.string(),
    })
        .options({
            allowUnknown: true,
        })
        .required(),
}).options({
    allowUnknown: true,
});
