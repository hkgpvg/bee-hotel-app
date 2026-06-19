# Bee Hotel Monitoring Dashboard

A real-time monitoring dashboard for Bee hotel environmental data, tracking temperature, humidity, fan status, and alerts.

## Features

- **Current Status Panel** - Real-time display of latest sensor readings
- **Temperature Trends** - Line charts comparing indoor vs outdoor temperature over time
- **Humidity Trends** - Line charts comparing indoor vs outdoor humidity over time
- **Fan Status Timeline** - Bar chart showing fan ON/OFF history
- **Alert Log** - Table of all alert events with statistics
- **Data Explorer** - Searchable, paginated table of all sensor readings

## Data

The dashboard displays sensor data with the following metrics:
- Date and Time
- Indoor Temperature (°C)
- Outdoor Temperature (°C)
- Indoor Humidity (%)
- Outdoor Humidity (%)
- Fan Status (ON/OFF)
- Alert Status (YES/NO)

## Usage

1. Open `index.html` in a web browser
2. Use the date range picker to filter data
3. Click "Apply" to filter, "Reset" to show all data
4. Search records in the Data Explorer panel
5. Adjust records per page (10, 25, 50, or 100)

## Technology Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern grid layout with responsive design
- **JavaScript** - Vanilla JS for data processing
- **Chart.js** - Interactive charts and visualizations
- **chartjs-adapter-date-fns** - Time axis support for charts

## Deployment

This dashboard is deployed on GitHub Pages and can be accessed at:
https://hkgpvg.github.io/bee-hotel-app/

## Local Development

```bash
# Clone the repository
git clone https://github.com/hkgpvg/bee-hotel-app.git

# Open in browser
open index.html
```

## Data Source

Data file: `bee_data.json` (7,781 sensor readings from February 17, 2026)

## License

MIT License
