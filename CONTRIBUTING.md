# Contributing to Ataa

Thank you for your interest in contributing to Ataa! This document provides guidelines for contributing to the project.

## Code of Conduct

This project follows humanitarian principles:
- **Do No Harm** - Consider privacy and security implications
- **Inclusion** - Welcome contributors of all backgrounds
- **Respect** - Be respectful in all interactions

## Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/ataa.git
   cd ataa
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running the Development Environment

```powershell
# Terminal 1: Core API
npm run dev:core

# Terminal 2: Hub
npm run dev:hub

# Terminal 3: Field App
npm run dev:field

# Terminal 4: Donor Portal
npm run dev:donor

# Terminal 5: Dashboard
npm run dev:dashboard
```

### Making Changes

1. **Write code** following our style guidelines
2. **Test your changes** thoroughly
3. **Update documentation** if needed
4. **Commit with descriptive messages**

### Commit Message Format

Use conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```
feat(field-app): add offline photo upload capability

Add ability to capture and store photos in IndexedDB for later upload.
Photos are compressed to reduce storage requirements.

Closes #123
```

```
fix(core): resolve sync conflict in household updates

Use last-write-wins strategy with conflict logging.

Fixes #456
```

## Code Style Guidelines

### TypeScript

```typescript
// ✅ Good
interface Household {
  id: string;
  token: string;
  familySize: number;
}

const createHousehold = async (data: Household): Promise<void> => {
  // Implementation
};

// ❌ Bad
function CreateHousehold(data) {
  // No types
}
```

### React Components

```typescript
// ✅ Good
interface HouseholdCardProps {
  household: Household;
  onEdit: (id: string) => void;
}

export const HouseholdCard: React.FC<HouseholdCardProps> = ({ 
  household, 
  onEdit 
}) => {
  return (
    <div className="household-card">
      {household.token}
    </div>
  );
};

// ❌ Bad
export default function HouseholdCard(props) {
  return <div>{props.household.token}</div>;
}
```

### API Routes

```typescript
// ✅ Good
router.get('/households/:id', 
  authenticate, 
  authorize(['admin', 'field_worker']),
  async (req: Request, res: Response) => {
    try {
      const household = await getHouseholdById(req.params.id);
      res.json({ success: true, data: household });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: { message: error.message } 
      });
    }
  }
);

// ❌ Bad
router.get('/households/:id', (req, res) => {
  // No authentication
  // No error handling
  const household = db.query('SELECT * FROM households WHERE id = ' + req.params.id);
  res.send(household);
});
```

## Testing

### Unit Tests

```typescript
// Example test (Jest)
describe('Priority Score Calculation', () => {
  it('should calculate correct score for vulnerable household', () => {
    const household = {
      familySize: 5,
      vulnerabilityFlags: ['female_headed', 'orphans'],
      displacementStatus: 'displaced'
    };
    
    const score = calculatePriorityScore(household);
    expect(score).toBeGreaterThan(80);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test --workspaces

# Run tests for specific package
cd packages/core
npm test

# Run with coverage
npm test -- --coverage
```

## Pull Request Process

1. **Update documentation** if you've added/changed features
2. **Ensure tests pass** - `npm test --workspaces`
3. **Update CHANGELOG.md** with your changes
4. **Create pull request** with detailed description
5. **Link related issues** - "Closes #123"
6. **Request review** from maintainers

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
```

## Areas for Contribution

### High Priority

1. **Testing** - Unit tests, integration tests, E2E tests
2. **Documentation** - API examples, tutorials, translations
3. **Accessibility** - WCAG 2.1 compliance, screen reader support
4. **Performance** - Optimize database queries, reduce bundle size

### Features

1. **QR Code Printing** - Generate QR codes for household tokens
2. **SMS Notifications** - Notify beneficiaries of distributions
3. **Photo Uploads** - Document verification photos
4. **Offline Maps** - Embed map tiles for offline use
5. **Multi-language** - Add translations (Arabic, English, French)
6. **Reports** - Export reports as PDF
7. **Analytics** - Advanced visualizations

### Bug Fixes

Check [GitHub Issues](https://github.com/ataa/ataa/issues) for:
- Bugs labeled `good first issue`
- Feature requests labeled `help wanted`

## Package-Specific Guidelines

### @ataa/shared

When adding types:
```typescript
// Always export from index.ts
export type { NewType } from './types';

// Document complex types
/**
 * Represents a household in the system
 */
export interface Household {
  // ...
}
```

### @ataa/core

When adding API endpoints:
1. Add route in appropriate file (`routes/`)
2. Add middleware (auth, audit, validation)
3. Update API.md documentation
4. Add integration test

### @ataa/field-app

When working on offline features:
1. Test in offline mode (DevTools → Network → Offline)
2. Verify IndexedDB operations
3. Test sync when back online
4. Check service worker updates

## Security Guidelines

### Do NOT commit:
- API keys or secrets
- Database credentials
- JWT secrets
- Personal data or test data with real names

### Always:
- Use parameterized queries (prevent SQL injection)
- Validate input (server-side)
- Hash passwords (bcrypt)
- Use HTTPS in production
- Follow principle of least privilege (RBAC)

### Example - Input Validation

```typescript
// ✅ Good - Validate with Zod
import { z } from 'zod';

const HouseholdSchema = z.object({
  token: z.string().regex(/^HH-\d{6}$/),
  familySize: z.number().int().positive().max(50),
  zoneId: z.string().uuid()
});

router.post('/households', async (req, res) => {
  try {
    const data = HouseholdSchema.parse(req.body);
    // Safe to use data
  } catch (error) {
    res.status(400).json({ error: 'Invalid input' });
  }
});

// ❌ Bad - No validation
router.post('/households', async (req, res) => {
  const household = await db.query(
    `INSERT INTO households (token) VALUES ('${req.body.token}')`
  );
});
```

## Privacy Considerations

When working with household data:
- **Minimize data collection** - Only collect what's necessary
- **Aggregate when possible** - No personal data in donor portal
- **Coarse locations** - Use zones, not GPS coordinates
- **Tokens over names** - Prefer HH-123456 over full names
- **Audit everything** - Log all access to sensitive data

## Accessibility

### Requirements

- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader support
- RTL (Right-to-Left) for Arabic

### Example

```tsx
// ✅ Good
<button 
  aria-label="حذف الأسرة" 
  onClick={handleDelete}
>
  <TrashIcon aria-hidden="true" />
</button>

// ❌ Bad
<div onClick={handleDelete}>
  🗑️
</div>
```

## Documentation

### When to Update Docs

- Adding new API endpoints → Update API.md
- Changing architecture → Update ARCHITECTURE.md
- Adding setup steps → Update SETUP.md
- New features → Update README.md

### Doc Style

```markdown
# Clear Headings

Brief introduction explaining what this section covers.

## Subsections

Use code blocks for examples:

```bash
npm install
```

Use tables for reference data:

| Field | Type | Required |
|-------|------|----------|
| token | string | Yes |
```

## Questions?

- **GitHub Issues** - For bugs and feature requests
- **Discussions** - For questions and ideas
- **Email** - For security concerns

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Ataa! 🙏**

Your work helps deliver aid to those who need it most.
