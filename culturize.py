#!/usr/bin/env python

# System imports
from argparse import ArgumentParser
from os import path
import csv

# Constants
NGINX_CONF_FILE  = 'nginx_redirect.conf'
APACHE_CONF_FILE = '.htaccess'

# Functions
def construct_file_path(directory, file_name):
    """Given a directory and a file_name, construct a full file_path."""
    return path.join(directory, file_name)

def construct_webserver_rules(entries, webserver, subdir):
    """Construct webserver redirect rules based on webserver."""
    lst = []
    if webserver == 'nginx':
        prefix = ""
        for row in entries:
            redir = ""
            if subdir:
                redir = f"{subdir}/"
            if row['docType']:
                redir = f"{redir}{row['docType']}/"
            redir = f"{redir}{row['pid']}"
            lst.append(f"rewrite /{redir}$ {row['url']} redirect ;")
    else:
        prefix = "Options +FollowSymLinks\nRewriteEngine on\n\n"
        for row in entries:
            redir = ""
            if row['docType']:
                redir = f"{row['docType']}/"
            redir = f"{redir}{row['pid']}"
            lst.append(f"RewriteRule {redir}$ {row['url']} [R=302,NC,NE,L]")
    return prefix + '\n'.join(lst) + '\n'

def is_valid_row(row):
    """check if a row is valid for transformation"""
    if not row["PID"]:
        return False
    if not row["document type"]:
        return False
    if not row["URL"]:
        return False
    return True

def parse_csv(filename):
    """Split csv file in rows and extract usefull information"""
    rows = []
    with open(filename, 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if is_valid_row(row):
                rows.append({"pid": row["PID"], "docType": row["document type"],
                             "url": row["URL"]})
    return rows

def main(args):
    """Main culturize function """
    rows = parse_csv(args.csv)

    file_name = NGINX_CONF_FILE if args.target == 'nginx' else APACHE_CONF_FILE
    directory = args.dest if args.dest else ''

    result = construct_webserver_rules(rows, args.target, args.subdir)
    destination_file_path = construct_file_path(directory, file_name)

    with open(destination_file_path, 'w') as d:
        d.write(result)

if __name__ == "__main__":
    parser = ArgumentParser(description="Convert csv uri files to webserver redirect rules")
    parser.add_argument('csv', help="CSV file to parse")
    parser.add_argument('-t', '--target', required=True, choices=['apache', 'nginx'],
                        help="target web server")
    parser.add_argument('-d', '--dest',
                        help="destination directory")
    parser.add_argument('-s', '--subdir', default="")
                        help="subdirectory to be used in nginx rewrite rules")
    args = parser.parse_args()
    main(args)
