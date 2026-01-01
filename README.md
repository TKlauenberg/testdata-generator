# testdata-ai

Declarative test data generation using a custom DSL with deterministic, reproducible output.

## Overview

testdata-ai is a TypeScript-based tool for generating realistic test data from declarative schema definitions. It uses a custom domain-specific language (DSL) to describe data structures and generation rules, producing deterministic output through a seeded PRNG implementation.

## Workspace Structure

This is a Bun monorepo with two packages:

```
testdata-ai/
├── packages/
│   ├── core/                    # @testdata-ai/core (library)
│   │   ├── src/
│   │   │   ├── index.ts         # Public API exports
│   │   │   └── index.test.ts    # Core tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── cli/                     # @testdata-ai/cli (CLI tool)
│       ├── bin/
│       │   ├── td.ts            # CLI executable
│       │   └── td.test.ts       # CLI tests
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json                 # Bun workspaces root
├── tsconfig.json                # Shared TypeScript config
├── bunfig.toml                  # Bun configuration
└── README.md
```

### Packages

- **`@testdata-ai/core`**: Core library containing the scanner, parser, semantic analyzer, and generator
- **`@testdata-ai/cli`**: Command-line interface tool for working with .td schema files

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.x or later

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd testdata-ai

# Install dependencies
bun install

# Build packages
bun run build

# Run tests
bun test
```

### Running the CLI

```bash
# Show version
bun packages/cli/bin/td.ts --version

# Show help
bun packages/cli/bin/td.ts --help
```

## Development

### Building

```bash
# Build all packages
bun run build

# Build specific package
bun run --cwd packages/core build
bun run --cwd packages/cli build
```

### Testing

```bash
# Run all tests
bun test

# Run tests for specific package
bun test packages/core
bun test packages/cli
```

### Project Structure

- All source files use **camelCase.ts** naming convention
- TypeScript strict mode is enabled throughout
- ESM modules only (no CommonJS)
- Co-located tests (*.test.ts files next to implementation)
- Each module exports through index.ts

## Technology Stack

- **Runtime**: Bun 1.x
- **Language**: TypeScript 5.x with strict mode
- **CLI Framework**: Commander.js 14.x
- **Testing**: Bun's built-in test runner

## Documentation

See the [docs/](docs/) directory for detailed documentation:

- [Architecture](docs/architecture.md) - System design and technical decisions
- [Project Context](docs/project-context.md) - Implementation rules and conventions
- [Epics](docs/epics.md) - Feature roadmap and sprint planning

## License

[License information to be added]

## Contributing

[Contributing guidelines to be added]

# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
