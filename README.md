# Mrrakc

Mrrakc is a structured data project that documents places, people, and provinces in Morocco, with a focus on cultural, historical, and geographical information.

## 🗂️ Project Structure

- `data/` - Contains all the data files organized by type:
  - `people/` - Information about notable individuals
  - `places/` - Information about locations, landmarks, and sites
  - `provinces/` - Information about administrative regions
- `schema/` - JSON schema definitions that validate the data structure
- `scripts/` - Utility scripts for validating and working with the data

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [Just](https://github.com/casey/just) command runner (optional, for convenience)
- [Docker](https://www.docker.com/) (optional, for containerized validation)

### Installation

Clone the repository:

```bash
git clone https://github.com/yourusername/mrrakc.git
cd mrrakc
```

### Validation

To validate all data files:

```bash
node scripts/validate.js
```

If you have Just installed:

```bash
just validate
```

Using Docker (no local dependencies required):

```bash
just docker-validate
```

## 📝 Data Structure

### Places

Places represent physical locations such as museums, parks, historical sites, etc. Each place has:

- Categorization (`kind`) in the format `category/type` (e.g., `culture/museum`)
- Name and slug identifier
- Description
- Geographic location (province, coordinates)
- Associated people
- Timeline of significant events
- Access information
- Links to external resources

### People

People represent notable individuals associated with places. Each person has:

- Name and slug identifier
- Biographical information
- Birth place
- Designations (roles/professions)
- Timeline of significant events
- Links to external resources

### Provinces

Provinces represent administrative regions in Morocco. Each province has:

- Name and slug identifier
- Region (larger administrative area it belongs to)
- Country (always "Morocco")

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to add or modify data.

## 📊 Usage Ideas

This dataset can be used for:

- Creating interactive maps of cultural and historical sites
- Building educational tools about Moroccan heritage
- Developing tourism applications
- Research on historical connections between people and places
- Analysis of cultural landmarks and their distribution

## 📄 License

This project is licensed under [LICENSE] - see the LICENSE file for details.

## 🙏 Acknowledgements

- Contributors who have added data to this project
- Open source tools and libraries that make this project possible
