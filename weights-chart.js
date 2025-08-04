// Weights Chart Component
// Handles fetching data from Supabase and creating an interactive chart

class WeightsChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
        this.supabaseUrl = 'https://ddbobialzdjkzainyqgb.supabase.co';
        // Supabase configuration
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYm9iaWFsemRqa3phaW55cWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MzQ0MTgsImV4cCI6MjA2MjIxMDQxOH0.CAstIrTFMcIAIDht0ZacLYY-obBptH3XXShohSzbwjU';
        this.isLoaded = false;
        // removed initialZoomApplied flag – no longer needed
    }

    async init() {
        try {
            await this.loadDependencies();
            const data = await this.fetchWeightsData();
            this.createChart(data);
            this.isLoaded = true;
        } catch (error) {
            console.error('Error initializing weights chart:', error);
            this.showError('Failed to load weights data');
        }
    }

    async loadDependencies() {
        // Load Chart.js and date adapter if not already loaded
        if (typeof Chart === 'undefined') {
            await this.loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js');
            await this.loadScript('https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js');
        }
        
        // Load zoom plugin with correct global reference
        if (typeof window.ChartZoom === 'undefined') {
            await this.loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js');
        }

        // Load Supabase client if not already loaded
        if (typeof window.supabase === 'undefined') {
            await this.loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js');
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async fetchWeightsData() {
        try {
            // Initialize Supabase client
            const { createClient } = window.supabase;
            const client = createClient(this.supabaseUrl, this.supabaseKey);

            console.log('🔍 Fetching ALL weight records using pagination...');
            
            // Fetch ALL records using pagination
            const allData = [];
            let page = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                console.log(`🔍 Fetching page ${page + 1}...`);
                const { data, error } = await client
                    .from('measurements')
                    .select('*')
                    .order('withings_timestamp', { ascending: false })
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) {
                    console.warn(`Error fetching page ${page + 1}:`, error);
                    break;
                }

                if (!data || data.length === 0) {
                    hasMore = false;
                } else {
                    allData.push(...data);
                    console.log(`📄 Page ${page + 1}: ${data.length} records (total so far: ${allData.length})`);
                    
                    // If we got less than a full page, we're done
                    if (data.length < pageSize) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                }
            }

            console.log(`✅ Successfully fetched ${allData.length} total weight records from measurements`);
            const processedData = this.processData(allData);
            this.updateTitle(processedData);
            return processedData;
        } catch (error) {
            console.error('Error fetching weights data:', error);
            console.warn('Using sample data instead');
            // Return sample data for demonstration if real data fails
            const sampleData = this.getSampleData();
            this.updateTitle(sampleData);
            return sampleData;
        }
    }

    processData(rawData) {
        // Process the raw data into chart-friendly format
        const processedData = rawData.map(item => {
            const date = new Date(item.withings_timestamp);
            const weightKg = parseFloat(item.weight_kg);
            const weightLbs = (weightKg * 2.20462).toFixed(1); // Convert kg to lbs
            
            return {
                x: date,
                y: weightKg,
                weightLbs: parseFloat(weightLbs),
                label: `${weightKg.toFixed(1)} kg (${weightLbs} lbs)`,
                rawData: item
            };
        });

        return processedData.sort((a, b) => a.x - b.x); // Always sort chronologically for chart
    }

    getSampleData() {
        // Sample data for demonstration (matching the real data format)
        const now = new Date();
        const sampleData = [];
        
        for (let i = 30; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const weightKg = 104 + Math.random() * 4 - 2; // Random weight around 104kg
            const weightLbs = (weightKg * 2.20462);
            
            sampleData.push({
                x: date,
                y: weightKg,
                weightLbs: weightLbs,
                label: `${weightKg.toFixed(1)} kg (${weightLbs.toFixed(1)} lbs)`
            });
        }
        
        return sampleData;
    }

    createChart(data) {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container with id '${this.containerId}' not found`);
            return;
        }

        // Create canvas element
        const canvas = document.createElement('canvas');
        canvas.id = `${this.containerId}-canvas`;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        // Prevent chart clicks from bubbling up to card click handler
        canvas.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        canvas.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        });
        canvas.addEventListener('touchend', (e) => {
            e.stopPropagation();
        });
        
        container.innerHTML = '';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');

        // Register the zoom plugin (handle different global references)
        if (window.ChartZoom) {
            Chart.register(window.ChartZoom);
        } else if (window.chartjsPluginZoom) {
            Chart.register(window.chartjsPluginZoom.default || window.chartjsPluginZoom);
        }

        // ----- calculate initial 3-month window -----
        let initialMin = undefined;
        let initialMax = undefined;
        if (Array.isArray(data) && data.length) {
            // DEBUG: Log the raw data
            console.log('🔍 Raw data points:', data.length);
            console.log('🔍 First 3 data points:', data.slice(0, 3).map(pt => ({
                date: pt.x.toLocaleDateString(),
                weight: pt.y
            })));
            console.log('🔍 Last 3 data points:', data.slice(-3).map(pt => ({
                date: pt.x.toLocaleDateString(), 
                weight: pt.y
            })));
            
            const latestMs = Math.max(...data.map(pt => pt.x.getTime()));
            const earliestMs = Math.min(...data.map(pt => pt.x.getTime()));
            const latestDate = new Date(latestMs);
            const earliestDate = new Date(earliestMs);
            
            console.log('🔍 Date range in data:');
            console.log('   Earliest:', earliestDate.toLocaleDateString());
            console.log('   Latest:', latestDate.toLocaleDateString());
            
            const threeMonthsAgo = new Date(latestDate);
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            
            console.log('🔍 Three months ago from latest:', threeMonthsAgo.toLocaleDateString());
            
            initialMin = Math.max(threeMonthsAgo.getTime(), earliestMs);
            initialMax = latestMs;
            
            console.log('🔍 Chart window will be:');
            console.log('   From:', new Date(initialMin).toLocaleDateString());
            console.log('   To:', new Date(initialMax).toLocaleDateString());
            console.log('   Window size (days):', Math.round((initialMax - initialMin) / (1000 * 60 * 60 * 24)));
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Weight',
                    data: data,
                    borderColor: '#6b7280',
                    backgroundColor: 'rgba(107, 114, 128, 0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: '#6b7280',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        adapters: {
                            date: {
                                zone: 'UTC'
                            }
                        },
                        time: {
                            // Let Chart.js auto-determine the best unit based on zoom level
                            displayFormats: {
                                day: 'MMM dd',
                                week: 'MMM dd',
                                month: "MMM 'yy",
                                quarter: "MMM 'yy",
                                year: 'yyyy'
                            }
                        },
                        min: initialMin,
                        max: initialMax,
                        title: {
                            display: false, // Turn off the "Date" title
                            text: 'Date',
                            color: '#6b7280',
                            font: { family: "'Space Mono', 'Roboto Mono', monospace", size: 12 }
                        },
                        grid: { color: 'rgba(107, 114, 128, 0.1)' },
                        ticks: { 
                            color: '#6b7280', 
                            font: { family: "'Space Mono', 'Roboto Mono', monospace", size: 10 },
                            maxTicksLimit: 12, // Limit number of ticks for better readability
                            callback: function(value, index, ticks) {
                                // Custom formatting based on time range
                                const range = this.max - this.min;
                                const oneYear = 365 * 24 * 60 * 60 * 1000;
                                const sixMonths = 180 * 24 * 60 * 60 * 1000;
                                
                                const date = new Date(value);
                                
                                if (range > oneYear) {
                                    // Show month + year for ranges over 1 year
                                    const month = date.toLocaleDateString('en-US', { month: 'short' });
                                    const year = date.toLocaleDateString('en-US', { year: '2-digit' });
                                    return `${month} '${year}`;
                                } else if (range > sixMonths) {
                                    // Show day + month for ranges over 6 months
                                    const day = date.getDate();
                                    const month = date.toLocaleDateString('en-US', { month: 'short' });
                                    return `${day} ${month}`;
                                } else {
                                    // Show day + month for shorter ranges
                                    const day = date.getDate();
                                    const month = date.toLocaleDateString('en-US', { month: 'short' });
                                    return `${day} ${month}`;
                                }
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Weight (kg)',
                            color: '#6b7280',
                            font: {
                                family: "'Space Mono', 'Roboto Mono', monospace",
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(107, 114, 128, 0.1)'
                        },
                        ticks: {
                            color: '#6b7280',
                            font: {
                                family: "'Space Mono', 'Roboto Mono', monospace",
                                size: 10
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#333',
                        bodyColor: '#555',
                        borderColor: '#ddd',
                        borderWidth: 1,
                        cornerRadius: 6,
                        titleFont: {
                            family: "'Space Mono', 'Roboto Mono', monospace",
                            size: 12,
                            weight: 'bold'
                        },
                        bodyFont: {
                            family: "'Space Mono', 'Roboto Mono', monospace",
                            size: 11
                        },
                        callbacks: {
                            title: function(context) {
                                const date = new Date(context[0].parsed.x);
                                return date.toLocaleDateString('en-US', { 
                                    weekday: 'short',
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                });
                            },
                            label: function(context) {
                                const weightKg = context.parsed.y.toFixed(1);
                                const weightLbs = (context.parsed.y * 2.20462).toFixed(1);
                                return [
                                    `${weightKg} kg`,
                                    `${weightLbs} lbs`
                                ];
                            }
                        }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x',
                            threshold: 10,
                            onPan: function({chart}) {
                                // Handle pan events passively
                            }
                        },
                        zoom: {
                            wheel: {
                                enabled: false
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x',
                            sensitivity: 3,
                            onZoom: function({chart}) {
                                // Handle zoom events passively
                            }
                        },
                        limits: {
                            x: {
                                minRange: 86400000, // Minimum 1 day range
                                // min: data.length > 0 ? Math.min(...data.map(d => d.x.getTime())) : undefined, // REMOVED
                                // max: data.length > 0 ? Math.max(...data.map(d => d.x.getTime())) : undefined // REMOVED
                            },
                            y: {
                                minRange: 10 // Minimum 10 unit range
                            }
                        }
                    }
                },
                // animation: { // REMOVED
                //     onComplete: () => { // REMOVED
                //         if (!this.initialZoomApplied) { // REMOVED
                //             console.log('Chart animation complete. Applying initial zoom.'); // REMOVED
                //             this.setInitialZoom(data); // REMOVED
                //             this.initialZoomApplied = true; // REMOVED
                //         } // REMOVED
                //     } // REMOVED
                // }, // REMOVED
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });

        // Add zoom control buttons
        this.addZoomControls(container);

        // === New: Clear active marker when clicking outside the chart ===
        this.outsideClickHandler = (event) => {
            // If the click/touch is NOT inside the chart canvas, clear active elements
            if (!canvas.contains(event.target)) {
                if (this.chart) {
                    // Clear highlighted elements and hide tooltip
                    this.chart.setActiveElements([]);
                    if (this.chart.tooltip) {
                        this.chart.tooltip.setActiveElements([], { x: 0, y: 0 });
                    }
                    this.chart.update();
                }
            }
        };
        document.addEventListener('click', this.outsideClickHandler);
        document.addEventListener('touchstart', this.outsideClickHandler);
        // === End new code ===

        // DEBUG: Check what the chart is actually showing
        setTimeout(() => {
            if (this.chart && this.chart.scales && this.chart.scales.x) {
                const xScale = this.chart.scales.x;
                console.log('🔍 Chart is actually showing:');
                console.log('   From:', new Date(xScale.min).toLocaleDateString());
                console.log('   To:', new Date(xScale.max).toLocaleDateString());
                console.log('   Actual window size (days):', Math.round((xScale.max - xScale.min) / (1000 * 60 * 60 * 24)));
            }
        }, 500);
    }

    // ======== CHANGES INSIDE setInitialZoom ========= //
    // setInitialZoom(data) { // REMOVED
    //     if (!this.chart || !data || data.length === 0) return; // REMOVED
        
    //     // Calculate 3 calendar months ago from the most recent data point // REMOVED
    //     const latestDate = new Date(Math.max(...data.map(d => d.x.getTime()))); // REMOVED
    //     const threeMonthsAgo = new Date(latestDate); // REMOVED
    //     threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3); // REMOVED
        
    //     // Ensure we don't go beyond the actual data range // REMOVED
    //     const earliestDate = new Date(Math.min(...data.map(d => d.x.getTime()))); // REMOVED
    //     const startDate = threeMonthsAgo < earliestDate ? earliestDate : threeMonthsAgo; // REMOVED

    //     console.log('Applying zoom via zoomScale:', { // REMOVED
    //         min: startDate.toLocaleDateString(), // REMOVED
    //         max: latestDate.toLocaleDateString() // REMOVED
    //     }); // REMOVED
        
    //     // Use the official zoom plugin API to set the zoom // REMOVED
    //     this.chart.zoomScale('x', { // REMOVED
    //         min: startDate.getTime(), // REMOVED
    //         max: latestDate.getTime() // REMOVED
    //     }, 'none'); // 'none' prevents a recursive animation loop // REMOVED
    // } // REMOVED

    addZoomControls(container) {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'chart-zoom-controls';
        
        const createIconButton = (iconName, title, tooltipText) => {
            const button = document.createElement('button');
            button.className = 'chart-zoom-btn';
            button.title = title;
            button.setAttribute('data-tooltip', tooltipText);
            button.innerHTML = feather.icons[iconName].toSvg({ width: 18, height: 18 });
            return button;
        };
        
        const zoomFullyOutButton = createIconButton('maximize-2', 'Show All Time', 'Show all data');
        const zoomOutButton = createIconButton('zoom-out', 'Zoom Out', 'Zoom out');
        const zoomInButton = createIconButton('zoom-in', 'Zoom In', 'Zoom in');
        const zoomFullyInButton = createIconButton('target', 'Show Last Week', 'Last 7 days');

        // Event Listeners
        zoomInButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.chart) {
                // Clear active marker/tooltip
                this.chart.setActiveElements([]);
                if (this.chart.tooltip) {
                    this.chart.tooltip.setActiveElements([], { x: 0, y: 0 });
                }
                
                // Custom zoom in that anchors to the right (latest data)
                const xScale = this.chart.scales.x;
                const currentMin = xScale.min;
                const currentMax = xScale.max;
                const currentRange = currentMax - currentMin;
                
                // Calculate new range (zoom in by 25%)
                const newRange = currentRange / 1.25;
                
                // Keep the max (right side) the same, only move the min
                const newMin = currentMax - newRange;
                
                // Get data limits to ensure we don't zoom beyond available data
                const dataMin = this.chart.data.datasets[0].data.reduce((min, point) => 
                    Math.min(min, point.x.getTime()), Infinity);
                
                // Apply the zoom, but don't go beyond the data range
                const clampedMin = Math.max(newMin, dataMin);
                this.chart.zoomScale('x', { min: clampedMin, max: currentMax });
            }
        });

        zoomOutButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.chart) {
                // Clear active marker/tooltip
                this.chart.setActiveElements([]);
                if (this.chart.tooltip) {
                    this.chart.tooltip.setActiveElements([], { x: 0, y: 0 });
                }
                
                // Get current zoom state
                const xScale = this.chart.scales.x;
                const currentMin = xScale.min;
                const currentMax = xScale.max;
                const currentRange = currentMax - currentMin;
                
                // Calculate new range (zoom out by 25%)
                const newRange = currentRange * 1.25;
                
                // Keep the max (right side) the same, only move the min
                const newMin = currentMax - newRange;
                
                // Get data limits
                const dataMin = this.chart.data.datasets[0].data.reduce((min, point) => 
                    Math.min(min, point.x.getTime()), Infinity);
                const dataMax = this.chart.data.datasets[0].data.reduce((max, point) => 
                    Math.max(max, point.x.getTime()), -Infinity);
                
                // Apply the zoom, but don't go beyond the data range
                const clampedMin = Math.max(newMin, dataMin);
                
                // If we've hit the data minimum, we might need to adjust the max to maintain proper range
                if (clampedMin === dataMin && newRange > (dataMax - dataMin)) {
                    // Show full range if we're trying to zoom out beyond available data
                    this.chart.zoomScale('x', { min: dataMin, max: dataMax });
                } else {
                    this.chart.zoomScale('x', { min: clampedMin, max: currentMax });
                }
            }
        });

        zoomFullyOutButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.chart) {
                const dataMin = this.chart.data.datasets[0].data.reduce((min, point) => Math.min(min, point.x.getTime()), Infinity);
                const dataMax = this.chart.data.datasets[0].data.reduce((max, point) => Math.max(max, point.x.getTime()), -Infinity);
                if (isFinite(dataMin) && isFinite(dataMax)) {
                    this.chart.zoomScale('x', { min: dataMin, max: dataMax });
                }
            }
        });

        zoomFullyInButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.chart && this.chart.data.datasets[0].data.length > 0) {
                const data = this.chart.data.datasets[0].data;
                const dataMax = Math.max(...data.map(d => d.x.getTime()));
                
                const oneWeekAgo = new Date(dataMax);
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                const dataMin = Math.min(...data.map(d => d.x.getTime()));
                
                const finalMin = Math.max(oneWeekAgo.getTime(), dataMin);

                this.chart.zoomScale('x', { min: finalMin, max: dataMax });
            }
        });

        // Add comprehensive touch event handling for mobile
        const buttons = [zoomInButton, zoomOutButton, zoomFullyOutButton, zoomFullyInButton];
        
        buttons.forEach(button => {
            // Prevent touch events from bubbling to card handlers
            button.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault();
            }, { passive: false });
            
            button.addEventListener('touchend', (e) => {
                e.stopPropagation();
                e.preventDefault();
                // Manually trigger click after preventing default touch behavior
                button.click();
            }, { passive: false });
            
            button.addEventListener('touchmove', (e) => {
                e.stopPropagation();
            }, { passive: false });
            
            // Also prevent mousedown/mouseup for extra safety
            button.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            
            button.addEventListener('mouseup', (e) => {
                e.stopPropagation();
            });
        });

        // Append buttons in the new order
        controlsContainer.appendChild(zoomFullyOutButton);
        controlsContainer.appendChild(zoomOutButton);
        controlsContainer.appendChild(zoomInButton);
        controlsContainer.appendChild(zoomFullyInButton);

        container.style.position = 'relative';
        container.appendChild(controlsContainer);

        this.addResizeObserver(container);

        container.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // This function is no longer needed with the new button implementation.
    // updateToggleButton(toggleButton) { ... }

    // This function is no longer needed with the new button implementation.
    // handleToggleZoom(toggleButton) { ... }

    updateTitle(data) {
        if (!data || data.length === 0) return;
        
        const latestDate = new Date(Math.max(...data.map(d => d.x.getTime())));
        const earliestDate = new Date(Math.min(...data.map(d => d.x.getTime())));
        
        // Calculate the number of years
        const yearsDiff = latestDate.getFullYear() - earliestDate.getFullYear();
        
        // Update the title
        const titleElement = document.getElementById('weights-title');
        if (titleElement) {
            if (yearsDiff <= 1) {
                titleElement.textContent = 'My weight for the past year';
            } else {
                titleElement.textContent = `My weight for the past ${yearsDiff} years`;
            }
        }
        
        // Update BMI in the text content
        this.updateBMI(data);
    }
    
    updateBMI(data) {
        if (!data || data.length === 0) return;
        
        // Get the latest weight measurement
        const latestData = data.reduce((latest, current) => {
            return current.x.getTime() > latest.x.getTime() ? current : latest;
        });
        
        // Calculate BMI: weight (kg) / (height (m))^2
        // Height: 190cm = 1.90m
        const heightInMeters = 1.90;
        const weightKg = latestData.y;
        const bmi = weightKg / (heightInMeters * heightInMeters);
        
        console.log(`📊 Calculating BMI: ${weightKg}kg / (${heightInMeters}m)² = ${bmi.toFixed(1)}`);
        
        // Find the text content element and update it
        const card = document.querySelector('#weights-chart-container').closest('.card');
        const textContent = card ? card.querySelector('.text-content p') : null;
        if (textContent) {
            const currentText = textContent.innerHTML;
            const updatedText = currentText.replace(
                '{calculate based on last measurement}', 
                `${bmi.toFixed(1)}`
            );
            textContent.innerHTML = updatedText;
            console.log(`✅ Updated BMI text: ${bmi.toFixed(1)}`);
        } else {
            console.warn('⚠️ Could not find text content element to update BMI');
        }
    }

    addResizeObserver(container) {
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(entries => {
                if (this.chart) {
                    // Debounce the resize to avoid too many updates
                    clearTimeout(this.resizeTimeout);
                    this.resizeTimeout = setTimeout(() => {
                        this.chart.resize();
                    }, 100);
                }
            });
            
            resizeObserver.observe(container);
            
            // Store observer for cleanup
            this.resizeObserver = resizeObserver;
        }
    }

    showError(message) {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 200px;
                    color: #888;
                    font-family: 'Space Mono', 'Roboto Mono', monospace;
                    font-size: 0.9rem;
                    text-align: center;
                    flex-direction: column;
                ">
                    <div style="margin-bottom: 0.5rem;">⚠️</div>
                    <div>${message}</div>
                    <div style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.7;">
                        Displaying sample data for demonstration
                    </div>
                    <button onclick="window.location.reload()" style="
                        margin-top: 0.5rem;
                        padding: 0.25rem 0.5rem;
                        font-size: 0.7rem;
                        background: #f0f0f0;
                        border: 1px solid #ddd;
                        border-radius: 3px;
                        cursor: pointer;
                        font-family: 'Space Mono', 'Roboto Mono', monospace;
                    ">Retry</button>
                </div>
            `;
        }
    }

    destroy() {
        // === New: remove outside click handler ===
        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
            document.removeEventListener('touchstart', this.outsideClickHandler);
            this.outsideClickHandler = null;
        }
        // === End new code ===
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.isLoaded = false;
    }
}

// Export for use in other scripts
window.WeightsChart = WeightsChart; 