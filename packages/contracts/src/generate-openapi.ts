// OpenAPI generation from Zod schemas
import { z } from "zod";
import {
  RoomSchema,
  ParticipantSchema,
  PhaseSchema,
  UserSchema,
  PublicProfileSchema,
  TeamSchema,
  TeamMemberSchema,
  TeamRhythmSchema,
  CuePushBodySchema,
  CueModelSchema,
  OrchestrateResultSchema,
  OrchestrationTaskSchema,
} from "./api";

function zodToJsonSchema(schema: z.ZodTypeAny): any {
  // Basic Zod to JSON Schema conversion
  // This is a simplified version - in production use zod-to-json-schema
  const def = schema._def;
  
  switch (def.typeName) {
    case "ZodString": {
      const checks = (def.checks ?? []) as Array<{ kind: string }>;
      const emailCheck = checks.find((c) => c.kind === "email");
      const urlCheck = checks.find((c) => c.kind === "url");
      const uuidCheck = checks.find((c) => c.kind === "uuid");
      return { 
        type: "string", 
        format: emailCheck ? "email" : urlCheck ? "uri" : uuidCheck ? "uuid" : undefined 
      };
    }
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodNull":
      return { type: "null" };
    case "ZodOptional":
      return zodToJsonSchema(def.innerType);
    case "ZodNullable":
      return { ...zodToJsonSchema(def.innerType), nullable: true };
    case "ZodArray":
      return { type: "array", items: zodToJsonSchema(def.type) };
    case "ZodObject": {
      const properties: Record<string, any> = {};
      const required: string[] = [];
      const shape = def.shape() as Record<string, z.ZodTypeAny>;
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value);
        if (!value.isOptional()) {
          required.push(key);
        }
      }
      return { type: "object", properties, required };
    }
    case "ZodEnum":
      return { type: "string", enum: def.values };
    case "ZodUnion":
      return { anyOf: def.options.map(zodToJsonSchema) };
    case "ZodDefault":
      return zodToJsonSchema(def.innerType);
    case "ZodBranded":
      return zodToJsonSchema(def.type);
    default:
      return { type: "object" };
  }
}

const schemas = {
  Room: RoomSchema,
  Participant: ParticipantSchema,
  Phase: PhaseSchema,
  User: UserSchema,
  PublicProfile: PublicProfileSchema,
  Team: TeamSchema,
  TeamMember: TeamMemberSchema,
  TeamRhythm: TeamRhythmSchema,
  CuePushBody: CuePushBodySchema,
  CueModel: CueModelSchema,
  OrchestrateResult: OrchestrateResultSchema,
  OrchestrationTask: OrchestrationTaskSchema,
};

const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "SkillHive API",
    version: "1.0.0",
    description: "SkillHive API contracts generated from Zod schemas",
  },
  servers: [
    { url: "https://api.skillhivelabs.com", description: "Production server" },
    { url: "http://localhost:3000", description: "Development server" },
  ],
  components: {
    schemas: {} as Record<string, any>,
  },
  paths: {},
};

// Generate schemas
for (const [name, schema] of Object.entries(schemas)) {
  openApiSpec.components.schemas[name] = zodToJsonSchema(schema);
}

// Write to file
const fs = require("fs");
const path = require("path");
const outputPath = path.resolve(__dirname, "../../../../docs/openapi.yaml");

const yaml = require("js-yaml");
fs.writeFileSync(outputPath, yaml.dump(openApiSpec, { lineWidth: -1 }));

console.log(`OpenAPI spec generated at ${outputPath}`);