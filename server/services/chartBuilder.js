module.exports = {
  buildLineChart(sheetId, title, domainRange, seriesRanges, anchorRow, anchorCol, width = 600, height = 350) {
    return {
      addChart: {
        chart: {
          spec: {
            title,
            basicChart: {
              chartType: 'LINE',
              legendPosition: 'BOTTOM_LEGEND',
              axis: [
                { position: 'BOTTOM_AXIS', title: 'Date' },
                { position: 'LEFT_AXIS', title: 'Value' }
              ],
              domains: [{ domain: { sourceRange: { sources: [domainRange] } } }],
              series: seriesRanges.map(s => ({
                series: { sourceRange: { sources: [s] } },
                targetAxis: 'LEFT_AXIS'
              }))
            }
          },
          position: {
            overlayPosition: {
              anchorCell: { sheetId, rowIndex: anchorRow, columnIndex: anchorCol },
              widthPixels: width,
              heightPixels: height
            }
          }
        }
      }
    };
  },
  
  buildPieChart(sheetId, title, domainRange, dataRange, anchorRow, anchorCol, width = 500, height = 350) {
    return {
      addChart: {
        chart: {
          spec: {
            title,
            pieChart: {
              legendPosition: 'RIGHT_LEGEND',
              domain: { sourceRange: { sources: [domainRange] } },
              series: { sourceRange: { sources: [dataRange] } },
              threeDimensional: true
            }
          },
          position: {
            overlayPosition: {
              anchorCell: { sheetId, rowIndex: anchorRow, columnIndex: anchorCol },
              widthPixels: width,
              heightPixels: height
            }
          }
        }
      }
    };
  },
  
  buildColumnChart(sheetId, title, domainRange, seriesRanges, anchorRow, anchorCol, width = 600, height = 350) {
    return {
      addChart: {
        chart: {
          spec: {
            title,
            basicChart: {
              chartType: 'COLUMN',
              legendPosition: 'BOTTOM_LEGEND',
              axis: [
                { position: 'BOTTOM_AXIS', title: 'Category' },
                { position: 'LEFT_AXIS', title: 'Count / Value' }
              ],
              domains: [{ domain: { sourceRange: { sources: [domainRange] } } }],
              series: seriesRanges.map(s => ({
                series: { sourceRange: { sources: [s] } },
                targetAxis: 'LEFT_AXIS'
              }))
            }
          },
          position: {
            overlayPosition: {
              anchorCell: { sheetId, rowIndex: anchorRow, columnIndex: anchorCol },
              widthPixels: width,
              heightPixels: height
            }
          }
        }
      }
    };
  },

  buildAreaChart(sheetId, title, domainRange, seriesRanges, anchorRow, anchorCol, width = 600, height = 350) {
    return {
      addChart: {
        chart: {
          spec: {
            title,
            basicChart: {
              chartType: 'AREA',
              legendPosition: 'BOTTOM_LEGEND',
              axis: [
                { position: 'BOTTOM_AXIS', title: 'Date' },
                { position: 'LEFT_AXIS', title: 'Value' }
              ],
              domains: [{ domain: { sourceRange: { sources: [domainRange] } } }],
              series: seriesRanges.map(s => ({
                series: { sourceRange: { sources: [s] } },
                targetAxis: 'LEFT_AXIS'
              }))
            }
          },
          position: {
            overlayPosition: {
              anchorCell: { sheetId, rowIndex: anchorRow, columnIndex: anchorCol },
              widthPixels: width,
              heightPixels: height
            }
          }
        }
      }
    };
  },

  buildStackedColumnChart(sheetId, title, domainRange, seriesRanges, anchorRow, anchorCol, width = 600, height = 350) {
    return {
      addChart: {
        chart: {
          spec: {
            title,
            basicChart: {
              chartType: 'COLUMN',
              stackedType: 'STACKED',
              legendPosition: 'RIGHT_LEGEND',
              axis: [
                { position: 'BOTTOM_AXIS', title: 'Date' },
                { position: 'LEFT_AXIS', title: 'Value' }
              ],
              domains: [{ domain: { sourceRange: { sources: [domainRange] } } }],
              series: seriesRanges.map(s => ({
                series: { sourceRange: { sources: [s] } },
                targetAxis: 'LEFT_AXIS'
              }))
            }
          },
          position: {
            overlayPosition: {
              anchorCell: { sheetId, rowIndex: anchorRow, columnIndex: anchorCol },
              widthPixels: width,
              heightPixels: height
            }
          }
        }
      }
    };
  },

  buildBarChart(sheetId, title, domainRange, seriesRanges, anchorRow, anchorCol, width = 600, height = 350) {
    return {
      addChart: {
        chart: {
          spec: {
            title,
            basicChart: {
              chartType: 'BAR',
              legendPosition: 'BOTTOM_LEGEND',
              axis: [
                { position: 'BOTTOM_AXIS', title: 'Value' },
                { position: 'LEFT_AXIS', title: 'Category' }
              ],
              domains: [{ domain: { sourceRange: { sources: [domainRange] } } }],
              series: seriesRanges.map(s => ({
                series: { sourceRange: { sources: [s] } },
                targetAxis: 'BOTTOM_AXIS'
              }))
            }
          },
          position: {
            overlayPosition: {
              anchorCell: { sheetId, rowIndex: anchorRow, columnIndex: anchorCol },
              widthPixels: width,
              heightPixels: height
            }
          }
        }
      }
    };
  },

  createRange(sheetId, startRow, endRow, startCol, endCol) {
    return {
      sheetId,
      startRowIndex: startRow,
      endRowIndex: endRow,
      startColumnIndex: startCol,
      endColumnIndex: endCol
    };
  },

  hexToRgb(hex) {
    hex = hex.replace('#', '');
    return {
      red: parseInt(hex.substring(0, 2), 16) / 255,
      green: parseInt(hex.substring(2, 4), 16) / 255,
      blue: parseInt(hex.substring(4, 6), 16) / 255
    };
  },

  buildTheme() {
    return {
      primary: this.hexToRgb('#5C3B1E'),
      secondary: this.hexToRgb('#8B5E34'),
      accent: this.hexToRgb('#D4A373'),
      success: this.hexToRgb('#6B8E23'),
      bg: this.hexToRgb('#FFFDF8'),
      alt: this.hexToRgb('#F7F3EB'),
      white: this.hexToRgb('#FFFFFF'),
      black: this.hexToRgb('#000000')
    };
  },

  buildFormatRequests(sheet, frozenRows = 2, maxCols = 20) {
    const theme = this.buildTheme();
    const reqs = [];
    const sheetId = sheet.properties.sheetId;

    // 1. Delete existing bandings
    if (sheet.bandedRanges && sheet.bandedRanges.length > 0) {
      sheet.bandedRanges.forEach(b => {
        reqs.push({ deleteBanding: { bandedRangeId: b.bandedRangeId } });
      });
    }

    // 2. Freeze top rows
    if (frozenRows > 0) {
      reqs.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheetId,
            gridProperties: { frozenRowCount: frozenRows }
          },
          fields: 'gridProperties.frozenRowCount'
        }
      });
    }

    // 3. Bold and Color Headers
    reqs.push({
      repeatCell: {
        range: { sheetId: sheetId, startRowIndex: 0, endRowIndex: frozenRows },
        cell: {
          userEnteredFormat: {
            backgroundColor: theme.primary,
            textFormat: { bold: true, foregroundColor: theme.white, fontSize: 10 },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    });

    // 4. Default background and alignment for data
    reqs.push({
      repeatCell: {
        range: { sheetId: sheetId, startRowIndex: frozenRows },
        cell: {
          userEnteredFormat: {
            backgroundColor: theme.bg,
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,verticalAlignment)'
      }
    });

    // 5. Add Alternating Banding
    reqs.push({
      addBanding: {
        bandedRange: {
          range: { sheetId: sheetId, startRowIndex: frozenRows },
          rowProperties: {
            firstBandColor: theme.bg,
            secondBandColor: theme.alt
          }
        }
      }
    });

    // 6. Auto Resize Columns
    reqs.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId: sheetId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: maxCols
        }
      }
    });

    return reqs;
  }
};
