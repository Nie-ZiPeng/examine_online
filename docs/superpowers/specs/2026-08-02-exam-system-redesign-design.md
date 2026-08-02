# Online Exam System Frontend Redesign

## Overview

Redesign the frontend UI of the graduate project online exam system. The goal is to create a professional, modern, and visually impressive interface that maintains the seriousness of an exam environment while showcasing technical skill through refined animations and micro-interactions.

## Design Direction

**Style:** Professional严肃 + 现代简约 hybrid
**Color:** Morandi Blue (莫兰迪蓝) palette
**Layout:** Dark sidebar + light content area
**Animations:** Rich but refined micro-interactions
**Typography:** System fonts (PingFang SC / Microsoft YaHei)

## Tech Stack

- React (existing)
- Ant Design (existing, keep components)
- Tailwind CSS (new, for custom styling)
- CSS animations + transitions (for micro-interactions)

## Color System

### Primary Colors
```
Primary:        #3D5A80  (Morandi Blue)
Primary Hover:  #4A6B94
Primary Active: #2C4460
Primary Light:  #E8EDF3 (light blue background for tags/highlights)
```

### Neutral Colors
```
Background:     #F0F2F5  (page background, slight gray)
Surface:        #FFFFFF  (cards/content areas)
Border:         #E4E8EE  (borders, restrained)
Divider:        #F0F0F0
```

### Text Colors
```
Text Primary:   #1A2332  (near-black, for headings)
Text Secondary: #6B7B8D  (gray, for secondary text)
Text Disabled:  #B0B8C2
```

### Sidebar Colors
```
Sidebar BG:     #1A2332  (dark blue-black)
Sidebar Item:   #2A3A4E  (hover state)
Sidebar Active: #3D5A80  (selected item)
Sidebar Text:   #8B9BB4  (unselected text)
Sidebar Active Text: #FFFFFF
```

### Status Colors
```
Success:  #52C41A
Warning:  #FAAD14
Error:    #FF4D4F
Info:     #3D5A80
```

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 
             'Microsoft YaHei', 'Helvetica Neue', sans-serif;
```

### Type Scale
```
H1: 28px / 600 / #1A2332  (page titles, e.g. "考试管理")
H2: 22px / 600 / #1A2332  (card titles)
H3: 16px / 600 / #1A2332  (section titles)
Body: 14px / 400 / #1A2332
Caption: 12px / 400 / #6B7B8D  (auxiliary text)
```

### Line Heights
```
Headings: 1.3
Body: 1.6
```

## Spacing System (8px base)

```
Space-1:  4px
Space-2:  8px
Space-3:  12px
Space-4:  16px
Space-5:  20px
Space-6:  24px  (default card padding)
Space-8:  32px  (section spacing)
Space-10: 40px  (page-level spacing)
Space-12: 48px
```

## Layout Structure

```
┌─────────────────────────────────────────┐
│ ┌──────┐ ┌─────────────────────────────┐│
│ │      │ │  Header (white, 64px, shadow)││
│ │ Dark │ ├─────────────────────────────┤│
│ │ Side │ │                             ││
│ │ bar  │ │  Content Area               ││
│ │      │ │  (background #F0F2F5)       ││
│ │ 220px│ │                             ││
│ │      │ │  Content cards (white, rounded, shadow)│
│ └──────┘ │                             ││
│          └─────────────────────────────┘│
└─────────────────────────────────────────┘
```

- Sidebar: dark, 220px wide, collapsible to 80px
- Header: white, 64px height, user info + avatar on right
- Content: gray background, 24px padding, white content cards

## Component Styling

### Border Radius
```
Buttons:  8px
Cards:    12px
Inputs:   8px
Tags:     6px
Modals:   16px
```

### Shadows
```
Card:       0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)
Card Hover: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)
Dropdown:   0 6px 16px rgba(0,0,0,0.08)
Modal:      0 12px 40px rgba(0,0,0,0.12)
```

### Buttons
```
Primary:    #3D5A80 background, white text, hover darken
Secondary:  white background, #3D5A80 border + text
Ghost:      transparent background, #3D5A80 text
Height:     40px (default), 32px (small), 48px (large)
```

### Inputs
```
Height: 40px, border #E4E8EE
Focus:  #3D5A80 border + blue glow
Radius: 8px
```

## Animations & Micro-interactions

### Page Transitions
```
Page switch:
  - Fade in + slight upward movement (0.3s, ease-out)
  - Effect: opacity 0→1, translateY(8px→0)

Content area loading:
  - Cards enter sequentially (stagger 0.05s)
  - Effect: opacity 0→1, translateY(12px→0)
```

### Hover Micro-interactions
```
Table row:
  - Background color transition (0.2s)
  - Effect: bg from transparent → #F5F7FA

Buttons:
  - Background darken + slight upward movement (0.2s)
  - Effect: translateY(-1px), box-shadow enhance

Cards:
  - Shadow enhance + border highlight (0.3s)
  - Effect: box-shadow increase, border-color → #3D5A80

Sidebar menu items:
  - Left color bar appears + background change (0.2s)
  - Effect: selected item has 3px left color bar indicator
```

### State Feedback Animations
```
Button click:
  - Slight scale (0.15s)
  - Effect: scale(0.98) → scale(1)

Form validation error:
  - Input框 shake (0.4s)
  - Effect: translateX left-right swing

Success message:
  - Slide in from top (0.3s)
  - Effect: translateY(-100%) → translateY(0)
```

### Sidebar Collapse
```
Collapse/expand:
  - Width smooth transition (0.3s, cubic-bezier(0.4, 0, 0.2, 1))
  - Menu text fades out, icon centers
  - Expand: text delays 0.1s fade in
```

### Login Page (Key Showcase)
```
Brand area:
  - Decorative circles slow rotation (20s loop)
  - Brand name entrance: letter-by-letter fade in + upward movement

Form area:
  - Input focus: border gradient animation
  - Login button: gradient background + hover light sweep effect
```

### Reduced Motion
```
When prefers-reduced-motion: reduce:
  - All animations degrade to direct opacity display
  - Transition time set to 0
  - Preserve functional feedback (button state changes), remove decorative animations
```

## Page-Specific Designs

### Login Page
```
┌─────────────────────────────────────────┐
│ ┌──────────────┐ ┌─────────────────────┐│
│ │              │ │                     ││
│ │   Brand Area │ │    Form Area        ││
│ │   Gradient   │ │    Username/Password││
│ │   Decorative │ │    Login Button     ││
│ │   Circles    │ │                     ││
│ │              │ │                     ││
│ └──────────────┘ └─────────────────────┘│
└─────────────────────────────────────────┘
```

- Left 46% width, Morandi blue gradient background + decorative circles
- Right white background, form centered, large inputs
- Entrance animation: brand area and form area fade in sequentially

### Exam Taking Page (Student)
```
┌─────────────────────────────────────────┐
│  Countdown  [MM:SS]    Submit Button    │
├─────────────────────────────────────────┤
│                                         │
│  Q1. Question content...                │
│  ○ Option A                             │
│  ○ Option B                             │
│  ○ Option C                             │
│  ○ Option D                             │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Q2. Question content...                │
│  [Input field]                          │
│                                         │
└─────────────────────────────────────────┘
```

- Top fixed: countdown (prominent color) + submit button
- Content area: question cards arranged sequentially, clean and distraction-free
- Question cards: left question number color block + right content
- No extra animations, focus on exam experience

### Management Pages (Generic Template)
```
┌─────────────────────────────────────────┐
│  Page Title                    [Action] │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │  Stats   Stats   Stats   Stats  │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  Filter/Search                  │    │
│  ├─────────────────────────────────┤    │
│  │  Data Table                     │    │
│  │                                 │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                        Pagination       │
└─────────────────────────────────────────┘
```

- Top stats cards (if data available): 3-4 key metrics
- Table area: white card, row hover highlight
- Action column: icon buttons + text, hover color change

### Grading Page (Teacher)
```
┌─────────────────────────────────────────┐
│  Select Exam [Dropdown]                 │
├─────────────────────────────────────────┤
│  Exam records list (table)              │
│  Click "Grade" → open drawer            │
└─────────────────────────────────────────┘

┌─────────────────────────────────┐ Drawer
│  Student Info                    │ 720px
│  ─────────────────────────────  │
│  Q1. Correct: A  Student: B     │
│      ○ Correct  ○ Incorrect  Score: [ ]│
│  ─────────────────────────────  │
│  Q2. Correct: ...               │
│      [Auto Grade] [Submit]      │
└─────────────────────────────────┘
```

- Drawer slides in from right, width 720px
- Question cards: border separated, correct/incorrect states color-coded
- Auto grade button: one-click grade objective questions

### Exam Edit Page (Teacher)
```
┌─────────────────────────────────────────┐
│  ← Back  Exam Info                     │
├─────────────────────────────────────────┤
│  [Basic Info Form]                      │
│  Title / Description / Duration / Score / Time│
├─────────────────────────────────────────┤
│  Question List              [Add Question]│
│  ┌─────────────────────────────────┐    │
│  │  Type | Content | Score | Action│    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

- Two-section layout: top basic info, bottom question management
- Question add via Modal, supports 5 question types with dynamic forms
- Question list can be dragged to reorder (optional)

## Implementation Approach

### Step 1: Install Dependencies
```bash
npm install -D tailwindcss@^3.4.0
```
> Use Tailwind **v3**, not v4. CRA 5.0.1 auto-detects `tailwind.config.js` and injects the `tailwindcss` PostCSS plugin, so the v4 toolchain (`@tailwindcss/postcss`/`postcss`) is not needed and would break the build.

### Step 2: Configure Tailwind
- Create `tailwind.config.js` with custom color palette
- No manual PostCSS config needed — CRA 5.0.1 auto-detects `tailwind.config.js` and injects the `tailwindcss` PostCSS plugin
- Update `src/index.css` with Tailwind directives

### Step 3: Create Design Tokens
- CSS variables for colors, spacing, shadows
- Tailwind theme extension

### Step 4: Refactor Layout Component
- Dark sidebar with custom styling
- White header with shadow
- Content area with gray background

### Step 5: Refactor Login Page
- Keep existing structure, enhance with Tailwind classes
- Add animations

### Step 6: Refactor All Pages
- Apply consistent styling
- Add hover states and transitions
- Ensure responsive design

### Step 7: Add Animations
- Page transitions
- Hover micro-interactions
- Loading states

### Step 8: Test & Polish
- Test in both light/dark modes (if applicable)
- Test reduced motion
- Verify all animations work
- Check responsive design

## Success Criteria

1. Professional, modern appearance that fits an exam system
2. Consistent design language across all pages
3. Smooth animations that enhance UX without being distracting
4. Responsive design works on different screen sizes
5. Reduced motion support for accessibility
6. No visual regressions in functionality
