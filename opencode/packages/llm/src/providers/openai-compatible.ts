import { ProviderID, type ModelID } from "../schema"
import * as OpenAICompatibleChat from "../protocols/openai-compatible-chat"
import type { RouteDefaultsInput } from "../route/client"
import { AuthOptions, type ProviderAuthOption } from "../route/auth-options"
import { profiles, type OpenAICompatibleProfile } from "./openai-compatible-profile"

export const id = ProviderID.make("openai-compatible")

type GenericModelOptions = RouteDefaultsInput &
  ProviderAuthOption<"optional"> & {
    readonly provider?: string
    readonly baseURL: string
  }

export type FamilyModelOptions = RouteDefaultsInput &
  ProviderAuthOption<"optional"> & {
    readonly baseURL?: string
  }

export const routes = [OpenAICompatibleChat.route]

export const configure = (input: GenericModelOptions) => {
  const provider = input.provider ?? "openai-compatible"
  const { provider: _, baseURL, apiKey: _apiKey, auth: _auth, ...rest } = input
  const route = OpenAICompatibleChat.route.with({
    ...rest,
    provider,
    endpoint: { baseURL },
    auth: AuthOptions.bearer(input, []),
  })
  return {
    id: ProviderID.make(provider),
    model: (modelID: string | ModelID) => route.model({ id: modelID, provider: ProviderID.make(provider) }),
    configure,
  }
}

const define = (profile: OpenAICompatibleProfile, envVars?: string[]) => {
  const configureProfile = (input: FamilyModelOptions = {}) => {
    const facade = configure({
      ...input,
      baseURL: input.baseURL ?? profile.baseURL,
      provider: profile.provider,
    })
    return {
      id: ProviderID.make(profile.provider),
      model: facade.model,
      configure: configureProfile,
    }
  }

  // If envVars provided, override the auth to read from those env vars
  if (envVars && envVars.length > 0) {
    return {
      id: ProviderID.make(profile.provider),
      model: (modelID: string | ModelID) => {
        const route = OpenAICompatibleChat.route.with({
          provider: profile.provider,
          endpoint: { baseURL: profile.baseURL },
          auth: AuthOptions.bearer({ auth: undefined }, envVars),
        })
        return route.model({ id: modelID, provider: ProviderID.make(profile.provider) })
      },
      configure: (input: FamilyModelOptions = {}) => {
        const facade = configure({
          ...input,
          baseURL: input.baseURL ?? profile.baseURL,
          provider: profile.provider,
        })
        return {
          id: ProviderID.make(profile.provider),
          model: facade.model,
          configure,
        }
      },
    }
  }

  return configureProfile()
}

export const baseten = define(profiles.baseten)
export const cerebras = define(profiles.cerebras)
export const deepinfra = define(profiles.deepinfra)
export const deepseek = define(profiles.deepseek, ["DEEPSEEK_API_KEY"])
export const fireworks = define(profiles.fireworks)
export const groq = define(profiles.groq)
export const hep = define(profiles.hep, ["HEP_API_KEY"])
export const openrouter = define(profiles.openrouter)
export const togetherai = define(profiles.togetherai)
