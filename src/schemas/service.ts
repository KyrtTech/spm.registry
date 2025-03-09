const Service = {
    type: "object",
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      logo: { type: "string" },
      version: {type: "string"},
      downloadUrl: {type: "string"},
      dependsOn: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {type: "string"},
            uri: {type: "string"},
            version: {type: "string"},
            logo: {type: "string"}
          }
        },
        required: ['name', 'uri']
      }
    },
  };
  
  export const ServicesSchema = {
    response: {
      200: {
        type: "array",
        items: Service,
      },
    },
  };
  
  export const ServiceSchema = {
    params: {
      type: 'object',
      properties: {
        name: {
          type: "string",
        },
      },
      required: ['name']
    },
    response: {
      200: Service,
    },
  };
  