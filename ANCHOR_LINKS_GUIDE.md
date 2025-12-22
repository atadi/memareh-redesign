# How to Use Anchor Links in the Article Editor

Anchor links allow readers to jump to specific sections within the same article. Here's how to use them:

## Step 1: Add IDs to Your Headings

When you want to create a section that can be linked to, you need to add an ID to that heading.

### Using the Editor:

1. Create a heading (H1, H2, or H3)
2. Switch to **Preview mode** or use the HTML view
3. Manually edit the HTML to add an `id` attribute to the heading

**Example HTML:**
```html
<h2 id="safety-tips">نکات ایمنی</h2>
<h2 id="installation">نصب و راه‌اندازی</h2>
<h2 id="maintenance">نگهداری</h2>
```

### ID Naming Rules:
- Use lowercase letters
- Use hyphens instead of spaces
- Use only English letters and numbers
- Make it descriptive but short
- Examples: `safety-tips`, `step-1`, `conclusion`

## Step 2: Create Anchor Links

To create a link that jumps to a section:

1. Select the text you want to make clickable
2. Click the **Link** button (🔗) in the toolbar
3. Enter the anchor with a `#` prefix: `#section-id`

**Examples:**
```html
<a href="#safety-tips">مشاهده نکات ایمنی</a>
<a href="#installation">رفتن به بخش نصب</a>
<a href="#maintenance">نگهداری دستگاه</a>
```

## Complete Example

Here's a complete article structure with anchor links:

```html
<!-- Table of Contents at the top -->
<h2>فهرست مطالب</h2>
<ul>
  <li><a href="#safety-tips">نکات ایمنی</a></li>
  <li><a href="#installation">نصب و راه‌اندازی</a></li>
  <li><a href="#maintenance">نگهداری</a></li>
  <li><a href="#troubleshooting">عیب‌یابی</a></li>
</ul>

<!-- Section 1 -->
<h2 id="safety-tips">نکات ایمنی</h2>
<p>محتوای بخش نکات ایمنی...</p>

<!-- Section 2 -->
<h2 id="installation">نصب و راه‌اندازی</h2>
<p>محتوای بخش نصب...</p>

<!-- Section 3 -->
<h2 id="maintenance">نگهداری</h2>
<p>محتوای بخش نگهداری...</p>

<!-- Section 4 -->
<h2 id="troubleshooting">عیب‌یابی</h2>
<p>محتوای بخش عیب‌یابی...</p>
```

## Alternative: Manual HTML Editing

If you prefer to work directly with HTML:

1. Click the **Preview** button to toggle between editor and preview
2. In preview mode, you can see the HTML structure
3. When editing, you can manually add IDs to headings:

```html
<h2 id="my-section">عنوان بخش</h2>
```

## Testing Your Anchor Links

After publishing your article:

1. View the article on the live site
2. Click on an anchor link
3. The page should scroll smoothly to that section
4. The URL will update to show `#section-id`

## Tips:

- **Create a Table of Contents**: Add a list of anchor links at the beginning of long articles
- **Back to Top Links**: Add links like `<a href="#top">بازگشت به بالا</a>` at the end of sections
- **Descriptive IDs**: Use clear, descriptive IDs so you remember them later
- **Test Links**: Always test your anchor links after publishing

## Common Use Cases:

1. **Long Tutorials**: Create sections for each step
2. **FAQ Pages**: Each question can be an anchor
3. **Product Guides**: Link to specific features
4. **Legal Documents**: Link to specific clauses or sections

## Example: Creating a Table of Contents

```html
<div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
  <h3>فهرست مطالب</h3>
  <ul>
    <li><a href="#intro">مقدمه</a></li>
    <li><a href="#step1">گام اول: آماده‌سازی</a></li>
    <li><a href="#step2">گام دوم: نصب</a></li>
    <li><a href="#step3">گام سوم: تست</a></li>
    <li><a href="#conclusion">نتیجه‌گیری</a></li>
  </ul>
</div>

<h2 id="intro">مقدمه</h2>
<p>متن مقدمه...</p>

<h2 id="step1">گام اول: آماده‌سازی</h2>
<p>محتوای گام اول...</p>

<!-- و غیره -->
```

This creates a clickable table of contents that helps readers navigate your article easily!
