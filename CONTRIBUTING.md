# Contributing to Mrrakc

Thank you for your interest in contributing to Mrrakc! This document provides guidelines and instructions for contributing to the project.

## 🌟 How to Contribute

There are several ways to contribute:

1. **Add new data** - Add new places, people, or provinces
2. **Improve existing data** - Enhance descriptions, add missing information, correct errors
3. **Expand schema** - Suggest improvements to the data structure
4. **Improve tooling** - Enhance validation scripts and workflows

## 📋 Contribution Process

### 1. Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally
   ```bash
   git clone https://github.com/yourusername/mrrakc.git
   cd mrrakc
   ```

### 2. Create a Branch

Create a branch for your contribution:

```bash
git checkout -b add-new-data
```

### 3. Make Changes

#### Adding New Data

You can use the Just commands to create templates:

```bash
# Create a new person
just new-person "Person Name" person-name

# Create a new province
just new-province "Province Name" province-name "Region Name"

# Create a new place
just new-place "Place Name" place-name "category/kind"
```

Then edit the generated files to add detailed information.

#### File Naming Conventions

- All files should be named using the slug (kebab-case) and `.json` extension
- Example: `abderrahman-slaoui.json`

### 4. Validate Your Changes

Before submitting, validate your changes:

```bash
just validate
```

Fix any validation errors that are reported.

### 5. Submit a Pull Request

1. Commit your changes
   ```bash
   git add .
   git commit -m "Add new place: Abderrahman Slaoui Museum"
   ```

2. Push to your fork
   ```bash
   git push origin add-new-data
   ```

3. Create a Pull Request on GitHub from your fork to the main repository

### 6. Review Process

- Automated checks will run on your PR to validate the data
- Maintainers will review your contribution
- You may be asked to make changes before your PR is accepted

## 📚 Data Guidelines

### Places

- **Kind**: Must be one of the predefined categories/kinds (see below)
- **Description**: Should be informative and concise
- **Location**: Include accurate province and coordinates
- **People**: Reference existing people when possible
- **Access**: Provide accurate access information

### People

- **Bio**: Include relevant biographical information
- **Birth Place**: Reference an existing province
- **Designations**: Use consistent terminology

### Provinces

- **Region**: Use official region names
- **Country**: Always "Morocco"

## 🔍 Available Categories/Kinds

Places must use one of these predefined kinds:

- **history**: archaeological-site, gate, bastion, kasbah
- **nature**: cave, zoo, aquarium, forest, beach, lake, park
- **entertainment**: cinema, theatre, amusement-park, gaming
- **sports**: karting, skatepark, park, aerodrome, swimming-pool, stadium
- **culture**: workshop, library, museum, art-gallery
- **religion**: mosque, zaouiya, mausoleum, synagogue, jewish-site, church, christian-site
- **public-space**: park
- **urban**: square, park, fountain, landmark, corniche, viewpoint, street-art, port
- **shopping**: market, mall
- **leisure**: hammam
- **food**: restaurant, street-food, cafe, bakery
- **architecture**: building, villa, cite, palace, tower, school, house, skyscraper, hotel, district, garage, hospital, pharmacy, lighthouse, port

## 🚀 Advanced Contribution

### Adding New Enumerations

If you need to add new values to enumerations (like kinds, link types, etc.), submit a PR that modifies the relevant enum file in the `schema/enums/` directory.

### Schema Changes

For more substantial schema changes:

1. Create an issue describing the proposed change
2. After discussion, submit a PR with the changes
3. Update the validation script if necessary

## 🤝 Code of Conduct

- Be respectful and inclusive
- Focus on factual and accurate information
- Provide sources when possible
- Accept feedback gracefully

## 🙏 Thank You

Your contributions help document and preserve Morocco's rich cultural and historical heritage. Thank you for being a part of this project!
