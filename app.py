# app.py
from flask import Flask, render_template, request, jsonify, send_file
import json
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO

app = Flask(__name__)

SCHEDULES_FILE = 'schedules.json'

def load_schedules():
    if os.path.exists(SCHEDULES_FILE):
        with open(SCHEDULES_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_schedules(schedules):
    with open(SCHEDULES_FILE, 'w') as f:
        json.dump(schedules, f, indent=2)

def create_schedule_pdf(schedule):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []

    styles = getSampleStyleSheet()
    title_style = styles['Title']
    normal_style = styles['Normal']

    # Add title
    elements.append(Paragraph(f"Raydex Schedule: {schedule['name']}", title_style))
    elements.append(Paragraph(" ", normal_style))  # Add some space

    # Prepare data for the table
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    hours = [f"{h:02d}:00" for h in range(24)]
    
    data = [['Time'] + days]
    for hour in hours:
        row = [hour]
        for day in days:
            cell = ""
            for task in schedule['tasks']:
                if task['day'] == day and task['startTime'] <= hour < task['endTime']:
                    cell = task['name']
                    break
            row.append(cell)
        data.append(row)

    # Create the table
    table = Table(data)
    
    # Add style to the table
    style = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.green),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 14),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (0,-1), colors.beige),
        ('TEXTCOLOR', (0,1), (0,-1), colors.black),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
    ])
    table.setStyle(style)

    # Add the table to the elements
    elements.append(table)

    # Build the PDF
    doc.build(elements)

    buffer.seek(0)
    return buffer

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/schedules', methods=['GET'])
def get_schedules():
    schedules = load_schedules()
    return jsonify(schedules)

@app.route('/api/schedules', methods=['POST'])
def save_schedule():
    data = request.json
    schedules = load_schedules()
    
    schedule_id = datetime.now().strftime("%Y%m%d%H%M%S")
    
    processed_schedule = []
    for task in data['tasks']:
        processed_task = {
            'name': task['name'],
            'day': task['day'],
            'startTime': task['startTime'],
            'endTime': task['endTime'],
            'color': task['color']
        }
        processed_schedule.append(processed_task)
    
    schedules[schedule_id] = {
        'name': data.get('name', f'Schedule {schedule_id}'),
        'tasks': processed_schedule
    }
    
    save_schedules(schedules)
    
    return jsonify({'id': schedule_id, 'message': 'Schedule saved successfully'})

@app.route('/api/schedules/<schedule_id>', methods=['GET'])
def get_schedule(schedule_id):
    schedules = load_schedules()
    if schedule_id in schedules:
        return jsonify(schedules[schedule_id])
    else:
        return jsonify({'error': 'Schedule not found'}), 404

@app.route('/api/schedules/<schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    schedules = load_schedules()
    if schedule_id in schedules:
        del schedules[schedule_id]
        save_schedules(schedules)
        return jsonify({'message': 'Schedule deleted successfully'})
    else:
        return jsonify({'error': 'Schedule not found'}), 404

@app.route('/download/<schedule_id>')
def download_schedule(schedule_id):
    schedules = load_schedules()
    if schedule_id in schedules:
        schedule_data = schedules[schedule_id]
        pdf_buffer = create_schedule_pdf(schedule_data)
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=f'raydex_schedule_{schedule_id}.pdf',
            mimetype='application/pdf'
        )
    else:
        return jsonify({'error': 'Schedule not found'}), 404

if __name__ == '__main__':
    app.run(debug=True)