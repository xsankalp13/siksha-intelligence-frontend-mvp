import re
import os

with open('ts_errors.log', 'r') as f:
    lines = f.readlines()

for line in lines:
    match = re.search(r'^(src/[^\(]+)\((\d+),\d+\): error TS6133: \'([^\']+)\'', line)
    if match:
        file_path = match.group(1)
        line_num = int(match.group(2))
        ident = match.group(3)
        
        if os.path.exists(file_path):
            with open(file_path, 'r') as f2:
                content = f2.readlines()
            
            target_line = content[line_num - 1]
            # carefully remove the ident from the import on that line
            # It could be `Plus,` or `, Plus` or `{ Plus }`
            new_line = re.sub(r'\b' + ident + r'\b\s*,?', '', target_line)
            # if the import becomes empty curly braces { }, replace it
            new_line = re.sub(r'\{\s*\}', '{}', new_line)
            content[line_num - 1] = new_line
            
            with open(file_path, 'w') as f2:
                f2.writelines(content)
                
    # TS6192: All imports in import declaration are unused.
    match2 = re.search(r'^(src/[^\(]+)\((\d+),\d+\): error TS6192', line)
    if match2:
        file_path = match2.group(1)
        line_num = int(match2.group(2))
        if os.path.exists(file_path):
            with open(file_path, 'r') as f2:
                content = f2.readlines()
            content[line_num - 1] = '// ' + content[line_num - 1]
            with open(file_path, 'w') as f2:
                f2.writelines(content)

    # TS1484: 'ExamAttendanceStatus' is a type and must be imported using a type-only import
    match3 = re.search(r'^(src/[^\(]+)\((\d+),\d+\): error TS1484: \'([^\']+)\'', line)
    if match3:
        file_path = match3.group(1)
        line_num = int(match3.group(2))
        ident = match3.group(3)
        if os.path.exists(file_path):
            with open(file_path, 'r') as f2:
                content = f2.readlines()
            # replace `import { ExamAttendanceStatus }` with `import type { ExamAttendanceStatus }`
            content[line_num - 1] = content[line_num - 1].replace('import {', 'import type {')
            with open(file_path, 'w') as f2:
                f2.writelines(content)

print("Done fixing automatic errors")
