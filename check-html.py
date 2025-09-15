import os
import re

def scan_file(file_path):
    print(f"\nScanning: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        lines = content.split('\n')
        issues = []
        
        for i, line in enumerate(lines, 1):
            # Check for non-ASCII characters
            for j, char in enumerate(line):
                if ord(char) > 127:
                    issues.append({
                        'type': 'NON_ASCII',
                        'line': i,
                        'column': j + 1,
                        'char': char,
                        'char_code': ord(char),
                        'context': line[max(0, j-10):j+10]
                    })
            
            # Check for malformed HTML entities
            entities = re.findall(r'&[a-zA-Z0-9#]+;?', line)
            for entity in entities:
                if not entity.endswith(';'):
                    issues.append({
                        'type': 'MALFORMED_ENTITY',
                        'line': i,
                        'entity': entity,
                        'context': line.strip()
                    })
            
            # Check for stray brackets
            if '<' in line or '>' in line:
                # Count actual HTML tags
                tags = re.findall(r'<[^>]*>', line)
                entities = re.findall(r'&[lg]t;', line)
                bracket_count = line.count('<') + line.count('>')
                tag_bracket_count = sum(tag.count('<') + tag.count('>') for tag in tags)
                
                if bracket_count > tag_bracket_count + len(entities):
                    issues.append({
                        'type': 'STRAY_BRACKETS',
                        'line': i,
                        'context': line.strip()
                    })
            
            # Check script tags
            if '<script' in line:
                script_match = re.search(r'<script[^>]*>(.*?)</script>', line)
                if script_match and script_match.group(1).strip():
                    script_content = script_match.group(1)
                    if '&lt;' in script_content or '&gt;' in script_content:
                        issues.append({
                            'type': 'ENCODED_SCRIPT',
                            'line': i,
                            'context': line.strip()
                        })
        
        # Check for BOM
        with open(file_path, 'rb') as f:
            first_bytes = f.read(3)
            if first_bytes == b'\xef\xbb\xbf':
                issues.append({
                    'type': 'UTF8_BOM',
                    'message': 'File has UTF-8 BOM which can cause issues'
                })
        
        # Report results
        if not issues:
            print('No issues found')
        else:
            print(f'Found {len(issues)} issues:')
            for idx, issue in enumerate(issues, 1):
                print(f"\n{idx}. {issue['type']}:")
                if issue['type'] == 'NON_ASCII':
                    print(f"   Line {issue['line']}, Column {issue['column']}: '{issue['char']}' (code: {issue['char_code']})")
                    print(f"   Context: \"{issue['context']}\"")
                elif issue['type'] == 'MALFORMED_ENTITY':
                    print(f"   Line {issue['line']}: {issue['entity']}")
                    print(f"   Context: \"{issue['context']}\"")
                elif issue['type'] == 'STRAY_BRACKETS':
                    print(f"   Line {issue['line']}: Potential stray < or >")
                    print(f"   Context: \"{issue['context']}\"")
                elif issue['type'] == 'ENCODED_SCRIPT':
                    print(f"   Line {issue['line']}: Script contains HTML entities")
                    print(f"   Context: \"{issue['context']}\"")
                elif issue['type'] == 'UTF8_BOM':
                    print(f"   {issue['message']}")
        
        return issues
        
    except Exception as e:
        print(f'Error reading file: {e}')
        return []

# Scan HTML files
html_files = [
    'public/index.html',
    'admin-public/index.html', 
    'booking-public/index.html'
]

print('Scanning HTML files for encoding issues and stray characters...')

total_issues = 0
for file in html_files:
    if os.path.exists(file):
        issues = scan_file(file)
        total_issues += len(issues)
    else:
        print(f"File not found: {file}")

print(f'\nSummary: Found {total_issues} total issues across all files')

if total_issues == 0:
    print('All HTML files look clean!')
else:
    print('\nRecommended fixes:')
    print('1. Remove any non-ASCII characters or replace with HTML entities')
    print('2. Fix malformed HTML entities (add missing semicolons)')
    print('3. Escape stray < and > characters as &lt; and &gt;')
    print('4. Remove UTF-8 BOM if present')
    print('5. Fix any encoded content in script tags')