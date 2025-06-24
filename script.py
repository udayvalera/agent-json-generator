import os

def consolidate_src_files(src_dir='src', output_file='consolidated.txt'):
    if not os.path.isdir(src_dir):
        print(f"Directory '{src_dir}' not found.")
        return

    with open(output_file, 'w', encoding='utf-8') as out_f:
        for root, _, files in os.walk(src_dir):
            for file in files:
                file_path = os.path.join(root, file)
                # Construct relative file path
                rel_path = os.path.relpath(file_path)
                out_f.write(f"---\n")
                out_f.write(f"File Directory: {rel_path}\n")
                try:
                    with open(file_path, 'r', encoding='utf-8') as in_f:
                        content = in_f.read()
                    out_f.write(content)
                except Exception as e:
                    out_f.write(f"[Error reading file: {e}]\n")
                out_f.write("\n---\n")

if __name__ == "__main__":
    consolidate_src_files()