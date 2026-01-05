import { Before, setDefaultTimeout } from '@cucumber/cucumber';
import { configure, Duration } from '@serenity-js/core';
import { SerenityBDDReporter } from '@serenity-js/serenity-bdd';
import { TestCast } from './screenplay/Actors.ts';

// Configure Cucumber timeout (in milliseconds)
setDefaultTimeout(Duration.ofSeconds(10).inMilliseconds());

/**
 * Configure SerenityJS before any tests run.
 *
 * This sets up:
 * - The Cast (Actor factory) for creating Actors with Abilities
 * - Reporters for test output (SerenityBDD generates reports)
 */
Before({ tags: 'not @ignore' }, function () {
  configure({
    actors: new TestCast(),
    crew: [
      SerenityBDDReporter.fromJSON({
        specDirectory: './features',
      }),
    ],
  });
});
