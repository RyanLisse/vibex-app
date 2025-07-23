# Pull Request

## 📋 Description

<!-- Provide a brief description of the changes in this PR -->

## 🔗 Related Issues

<!-- Link to related issues using "Fixes #123" or "Closes #123" -->

## 🧪 Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🔧 Configuration change
- [ ] 🧹 Code cleanup/refactoring
- [ ] ⚡ Performance improvement
- [ ] 🔒 Security improvement

## ✅ Quality Checklist

### Code Quality
- [ ] Code follows the project's style guidelines (Biome formatting)
- [ ] Self-review of code has been performed
- [ ] Code is self-documenting or includes necessary comments
- [ ] No console.log statements left in production code
- [ ] No hardcoded values (use environment variables or constants)
- [ ] Functions are small and focused (single responsibility)
- [ ] Variable and function names are descriptive

### Error Handling
- [ ] All error cases are handled appropriately
- [ ] User-friendly error messages are provided
- [ ] Errors are logged with sufficient context
- [ ] Error boundaries are used for React components where appropriate
- [ ] API errors include proper status codes and messages
- [ ] Retry logic is implemented for transient failures

### Testing
- [ ] Unit tests added/updated for new functionality
- [ ] Integration tests added/updated where applicable
- [ ] Critical path tests cover the changes
- [ ] All tests pass locally
- [ ] Test coverage meets minimum requirements (90%+)
- [ ] Edge cases and error scenarios are tested
- [ ] Performance tests added for performance-critical changes

### Security
- [ ] No sensitive data exposed in logs or client-side code
- [ ] Input validation implemented for all user inputs
- [ ] Authentication and authorization checks in place
- [ ] SQL injection prevention measures applied
- [ ] XSS prevention measures applied
- [ ] CSRF protection implemented where needed
- [ ] Dependencies scanned for vulnerabilities

### Performance
- [ ] No performance regressions introduced
- [ ] Database queries are optimized
- [ ] Caching implemented where appropriate
- [ ] Bundle size impact assessed
- [ ] Memory leaks prevented
- [ ] Long-running operations are optimized or moved to background

### Accessibility
- [ ] Semantic HTML elements used
- [ ] ARIA labels added where necessary
- [ ] Keyboard navigation works properly
- [ ] Color contrast meets WCAG guidelines
- [ ] Screen reader compatibility verified
- [ ] Focus management implemented correctly

### Documentation
- [ ] README updated if needed
- [ ] API documentation updated
- [ ] Code comments added for complex logic
- [ ] Migration guide provided for breaking changes
- [ ] Changelog updated

## 🧪 Testing Instructions

<!-- Provide step-by-step instructions for testing this PR -->

1. 
2. 
3. 

## 📸 Screenshots/Videos

<!-- Add screenshots or videos demonstrating the changes -->

## 🚀 Deployment Notes

<!-- Any special deployment considerations -->

- [ ] Database migrations required
- [ ] Environment variables need to be updated
- [ ] Third-party service configuration changes needed
- [ ] Cache invalidation required
- [ ] Feature flags need to be updated

## 📊 Performance Impact

<!-- Describe any performance implications -->

- Bundle size change: 
- Database query impact: 
- Memory usage impact: 
- API response time impact: 

## 🔍 Code Review Focus Areas

<!-- Highlight specific areas that need extra attention during review -->

- 
- 
- 

## ⚠️ Breaking Changes

<!-- List any breaking changes and migration steps -->

## 📝 Additional Notes

<!-- Any additional information for reviewers -->

---

## Reviewer Checklist

### Functionality
- [ ] Feature works as described
- [ ] Edge cases handled properly
- [ ] Error scenarios tested
- [ ] Performance is acceptable
- [ ] No regressions introduced

### Code Quality
- [ ] Code is readable and maintainable
- [ ] Architecture decisions are sound
- [ ] No code duplication
- [ ] Proper separation of concerns
- [ ] Consistent with existing codebase

### Security Review
- [ ] No security vulnerabilities introduced
- [ ] Input validation is comprehensive
- [ ] Authentication/authorization is correct
- [ ] No sensitive data exposure

### Testing Review
- [ ] Test coverage is adequate
- [ ] Tests are meaningful and not just for coverage
- [ ] Tests are maintainable
- [ ] Critical paths are covered

### Documentation Review
- [ ] Code is self-documenting
- [ ] Complex logic is explained
- [ ] API changes are documented
- [ ] User-facing changes are documented

---

**Reviewer:** @<!-- reviewer username -->
**Review Date:** <!-- date -->
**Approval:** ✅ Approved / ❌ Changes Requested / 🤔 Needs Discussion
