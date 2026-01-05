import { Actor, Cast } from '@serenity-js/core';
import { PerformCalculations } from '../abilities/PerformCalculations.ts';
import { WorkWithResults } from '../abilities/WorkWithResults.ts';

/**
 * TestCast configures how Actors are created for Screenplay tests.
 *
 * Actors represent users/testers interacting with the system.
 * The prepare() method is called when a new Actor is instantiated,
 * allowing you to grant Abilities to the Actor.
 *
 * Example usage in step definitions:
 * ```typescript
 * Given('{actor} has a valid schema', (actor: Actor) => {
 *   // actor is automatically created with abilities
 * });
 * ```
 */
export class TestCast implements Cast {
  /**
   * Prepares an Actor by granting them Abilities.
   *
   * Abilities represent what an Actor can do (e.g., parse schemas, generate data).
   * They are implemented in features/support/abilities/ and added here.
   *
   * Current Abilities:
   * - PerformCalculations: Example demonstrating Screenplay pattern basics
   * - WorkWithResults: Example demonstrating Result<T, E> pattern integration
   *
   * Future stories will add real Abilities:
   * - ParseSchemas.usingCoreLibrary() (Story 2.x)
   * - GenerateData.usingCoreLibrary() (Story 3.x)
   *
   * @param actor - The Actor to prepare
   * @returns The prepared Actor with Abilities
   */
  prepare(actor: Actor): Actor {
    return actor.whoCan(PerformCalculations.using(), WorkWithResults.using());
  }
}
